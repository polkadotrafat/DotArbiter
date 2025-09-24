import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  GovernanceHub,
  ProposalLogic,
  DelegationLogic,
  XcmExecutor,
  MockXcmExecutor,
  MockReceiver,
} from "../typechain-types";
import { BaseContract } from "ethers";

// Constants
const XCM_PRECOMPILE_ADDRESS = "0x00000000000000000000000000000000000a0000";
const VOTING_PERIOD = 7 * 24 * 60 * 60; // 7 days in seconds

function getSelectors(contract: BaseContract): string[] {
  const selectors: string[] = [];
  contract.interface.forEachFunction((func) => {
    selectors.push(func.selector);
  });
  return selectors;
}

describe("DotArbiter Governance Protocol", function () {
  // Contracts
  let hub: GovernanceHub;
  let proposalLogic: ProposalLogic;
  let delegationLogic: DelegationLogic;
  let mockXcmExecutor: MockXcmExecutor;
  let mockReceiver: MockReceiver;

  // Attached instances for proxy interaction
  let hubAsProposal: ProposalLogic;
  let hubAsDelegation: DelegationLogic;
  let hubAsXcm: MockXcmExecutor;

  // Accounts
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // 1. Deploy all implementation contracts (and mocks)
    const ProposalLogicFactory = await ethers.getContractFactory("ProposalLogic");
    proposalLogic = await ProposalLogicFactory.deploy();

    const DelegationLogicFactory = await ethers.getContractFactory("DelegationLogic");
    delegationLogic = await DelegationLogicFactory.deploy();

    const MockXcmExecutorFactory = await ethers.getContractFactory("MockXcmExecutor");
    mockXcmExecutor = await MockXcmExecutorFactory.deploy();

    const MockReceiverFactory = await ethers.getContractFactory("MockReceiver");
    mockReceiver = await MockReceiverFactory.deploy();

    // 2. Deploy the GovernanceHub (the main proxy)
    const GovernanceHubFactory = await ethers.getContractFactory("GovernanceHub");
    hub = await GovernanceHubFactory.deploy();

    // 3. Programmatically set up the routing in the GovernanceHub
    // This is the core fix for the "Implementation not set" error.
    const logicContracts = [
        { contract: proposalLogic, name: "ProposalLogic" },
        { contract: delegationLogic, name: "DelegationLogic" },
        { contract: mockXcmExecutor, name: "MockXcmExecutor" },
    ];

    for (const logic of logicContracts) {
        const selectors = getSelectors(logic.contract);
        await hub.connect(owner).setImplementations(
            selectors,
            Array(selectors.length).fill(await logic.contract.getAddress())
        );
    }
    
    // 4. Create attached instances for easy interaction with the proxy
    hubAsProposal = proposalLogic.attach(await hub.getAddress()) as ProposalLogic;
    hubAsDelegation = delegationLogic.attach(await hub.getAddress()) as DelegationLogic;
    hubAsXcm = mockXcmExecutor.attach(await hub.getAddress()) as MockXcmExecutor;
  });

  describe("Deployment and Configuration", function () {
    it("Should set the correct owner", async function () {
      expect(await hub.owner()).to.equal(await owner.getAddress());
    });

    it("Should correctly map function selectors to implementations", async function () {
      // Test one selector from each logic contract to confirm setup
      const createProposalSelector = proposalLogic.interface.getFunction("createProposal").selector;
      expect(await hub.functionImplementations(createProposalSelector)).to.equal(await proposalLogic.getAddress());

      const delegateSelector = delegationLogic.interface.getFunction("delegate").selector;
      expect(await hub.functionImplementations(delegateSelector)).to.equal(await delegationLogic.getAddress());

      const executeProposalSelector = mockXcmExecutor.interface.getFunction("executeProposal").selector;
      expect(await hub.functionImplementations(executeProposalSelector)).to.equal(await mockXcmExecutor.getAddress());
    });
  });

  describe("Proposal Logic", function () {
    it("Should allow a user to create a proposal", async function () {
      await hubAsProposal.connect(user1).createProposal("Test Proposal 1", [
          { targetParaId: 0, target: await user2.getAddress(), value: 0, calldata_: "0x", description: "Action 1" },
        ]);

      expect(await hub.proposalCount()).to.equal(1);
      const proposal = await hub.proposals(1);
      expect(proposal.proposer).to.equal(await user1.getAddress());
      expect(proposal.status).to.equal(1); // Active
    });

    it("Should allow voting and correctly tally a passing proposal", async function () {
        await hubAsProposal.connect(user1).createProposal("Test Vote", [
            { targetParaId: 0, target: await user2.getAddress(), value: 0, calldata_: "0x", description: "" },
          ]);
        const proposalId = 1;
        await hubAsProposal.connect(user1).vote(proposalId, true, ethers.parseEther("60"));
        await hubAsProposal.connect(user2).vote(proposalId, false, ethers.parseEther("40"));
        await time.increase(VOTING_PERIOD + 1);
        await hubAsProposal.connect(owner).tallyProposal(proposalId);
        const proposalAfter = await hub.proposals(proposalId);
        expect(proposalAfter.status).to.equal(2); // Passed
    });

    it("Should correctly tally a failing proposal (majority not reached)", async function () {
        await hubAsProposal.connect(user1).createProposal("Test Fail", [{ targetParaId: 0, target: await user2.getAddress(),value: 0, calldata_: "0x", description: "" }]);
        const proposalId = 1;
        await hubAsProposal.connect(user1).vote(proposalId, true, ethers.parseEther("40"));
        await hubAsProposal.connect(user2).vote(proposalId, false, ethers.parseEther("60"));
        await time.increase(VOTING_PERIOD + 1);
        await hubAsProposal.connect(owner).tallyProposal(proposalId);
        const finalProposal = await hub.proposals(proposalId);
        expect(finalProposal.status).to.equal(3); // Failed
    });

    it("Should prevent voting if proposal is not active or user already voted", async function () {
        await hubAsProposal.connect(user1).createProposal("Test Reverts", [{ targetParaId: 0, target: await user2.getAddress(),value: 0, calldata_: "0x", description: "" }]);
        const proposalId = 1;
        await hubAsProposal.connect(user1).vote(proposalId, true, ethers.parseEther("1"));
        await expect(hubAsProposal.connect(user1).vote(proposalId, true, ethers.parseEther("1")))
            .to.be.revertedWith("Already voted");

        await time.increase(VOTING_PERIOD + 1);
        await expect(hubAsProposal.connect(user2).vote(proposalId, true, ethers.parseEther("1")))
            .to.be.revertedWith("Voting period ended");
    });
  });

  describe("Delegation Logic", function () {
    it("Should allow a user to delegate and undelegate their vote", async function () {
        await hubAsDelegation.connect(user1).delegate(await user2.getAddress());
        expect(await hub.delegates(await user1.getAddress())).to.equal(await user2.getAddress());

        await hubAsDelegation.connect(user1).undelegate();
        expect(await hub.delegates(await user1.getAddress())).to.equal(ethers.ZeroAddress);
    });

    it("Should prevent delegating to self or zero address", async function () {
        await expect(hubAsDelegation.connect(user1).delegate(await user1.getAddress()))
            .to.be.revertedWith("Cannot delegate to self");
        await expect(hubAsDelegation.connect(user1).delegate(ethers.ZeroAddress))
            .to.be.revertedWith("Invalid delegatee");
    });

    it("Should prevent a user from voting directly if they have delegated", async function () {
        // Arrange
        await hubAsProposal.connect(owner).createProposal("Test", [{ targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" }]);
        const proposalId = 1;
        const user1Power = ethers.parseEther("25");

        // Act: User1 delegates to User2
        await hubAsDelegation.connect(user1).delegate(await user2.getAddress());

        // Assert: User1's direct vote is now rejected
        await expect(
            hubAsProposal.connect(user1).vote(proposalId, true, user1Power)
        ).to.be.revertedWith("User has delegated their vote");
    });

    it("Should allow a delegate to vote on behalf of another voter", async function () {
        // Arrange
        await hubAsProposal.connect(owner).createProposal("Test Proxy Vote", [{ targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" }]);
        const proposalId = 1;
        const user1Power = ethers.parseEther("25");
        const user3Power = ethers.parseEther("10");

        await hubAsDelegation.connect(user1).delegate(await user2.getAddress());
        await hubAsDelegation.connect(user3).delegate(await user2.getAddress());

        // Act: User2 votes by proxy
        await hubAsProposal.connect(user2).voteByProxy(
            proposalId,
            true,
            [await user1.getAddress(), await user3.getAddress()],
            [user1Power, user3Power]
        );

        // Assert
        const proposal = await hub.proposals(proposalId);
        const expectedTotalPower = user1Power + user3Power;
        expect(proposal.forVotes).to.equal(expectedTotalPower);

        // FIX: Call the new, explicit getter function to check the mapping's value.
        expect(
            await hub.hasVoterVoted(proposalId, await user1.getAddress())
        ).to.be.true;

        expect(
            await hub.hasVoterVoted(proposalId, await user3.getAddress())
        ).to.be.true;
    });

    it("Should prevent a user from voting after their delegate has already voted for them, even if they undelegate", async function () {
        // Arrange
        await hubAsProposal.connect(owner).createProposal("Test Undelegate Attack", [{ 
            targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" 
        }]);
        const proposalId = 1;
        const user1Power = ethers.parseEther("50");

        // 1. User1 delegates to User2
        await hubAsDelegation.connect(user1).delegate(await user2.getAddress());

        // 2. User2 (the delegate) votes on behalf of User1
        await hubAsProposal.connect(user2).voteByProxy(
            proposalId,
            true, // Vote FOR
            [await user1.getAddress()],
            [user1Power]
        );

        // Act
        // 3. User1 now undelegates their vote
        await hubAsDelegation.connect(user1).undelegate();

        // Assert
        // 4. User1's attempt to vote directly should be rejected because their vote is already recorded.
        await expect(
            hubAsProposal.connect(user1).vote(proposalId, false, user1Power)
        ).to.be.revertedWith("Already voted");
    });
  });

  describe("XCM and Local Execution", function () {
    const localPaymentAmount = ethers.parseEther("1.5");
    const expectedDestination = "0x01010000d0070000";
    const expectedMessage = "0xdeadbeef";

    beforeEach(async function () {
        await hubAsProposal.connect(owner).createProposal("Execution Test", [
            { targetParaId: 0, target: await mockReceiver.getAddress(), value: localPaymentAmount, calldata_: "0x", description: "Local payment" },
            { targetParaId: 2000, target: ethers.ZeroAddress, value: 0, calldata_: ethers.AbiCoder.defaultAbiCoder().encode(["bytes", "bytes"], [expectedDestination, expectedMessage]), description: "XCM call" }
        ]);
        const proposalId = 1;
        await hubAsProposal.connect(owner).vote(proposalId, true, ethers.parseEther("100"));
        await time.increase(VOTING_PERIOD + 1);
        await hubAsProposal.connect(owner).tallyProposal(proposalId);
    });

    it("Should execute a local action by emitting an event from the mock executor", async function () {
        const proposalId = 1;
        await expect(hubAsXcm.connect(owner).executeProposal(proposalId, { value: localPaymentAmount }))
            .to.emit(hubAsXcm, "LocalActionExecuted")
            .withArgs(proposalId, await mockReceiver.getAddress(), localPaymentAmount, "0x");
    });

    it("Should execute an XCM action by emitting an event from the mock executor", async function () {
        const proposalId = 1;
        await expect(hubAsXcm.connect(owner).executeProposal(proposalId, { value: localPaymentAmount }))
            .to.emit(hubAsXcm, "XcmActionExecuted")
            .withArgs(proposalId, expectedDestination, expectedMessage);
    });
  });
});