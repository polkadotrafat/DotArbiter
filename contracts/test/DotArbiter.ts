import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  GovernanceHub,
  ProposalLogic,
  DelegationLogic,
  MockXcmExecutor,
  MockReceiver,
} from "../typechain-types";
import { BaseContract } from "ethers";

// Constants
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
  let user4: Signer;

  beforeEach(async function () {
    [owner, user1, user2, user3, user4] = await ethers.getSigners();

    // Deploy all implementation contracts (and mocks)
    const ProposalLogicFactory = await ethers.getContractFactory("ProposalLogic");
    proposalLogic = await ProposalLogicFactory.deploy();
    const DelegationLogicFactory = await ethers.getContractFactory("DelegationLogic");
    delegationLogic = await DelegationLogicFactory.deploy();
    const MockXcmExecutorFactory = await ethers.getContractFactory("MockXcmExecutor");
    mockXcmExecutor = await MockXcmExecutorFactory.deploy();
    const MockReceiverFactory = await ethers.getContractFactory("MockReceiver");
    mockReceiver = await MockReceiverFactory.deploy();
    const GovernanceHubFactory = await ethers.getContractFactory("GovernanceHub");
    hub = await GovernanceHubFactory.deploy();

    // Programmatically set up the routing in the GovernanceHub
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
    
    // Create attached instances for easy interaction with the proxy
    hubAsProposal = proposalLogic.attach(await hub.getAddress()) as ProposalLogic;
    hubAsDelegation = delegationLogic.attach(await hub.getAddress()) as DelegationLogic;
    hubAsXcm = mockXcmExecutor.attach(await hub.getAddress()) as MockXcmExecutor;
  });

  describe("Proposal & Voting Logic (1 Person, 1 Vote)", function () {
    it("Should allow a direct vote with a weight of 1", async function () {
        await hubAsProposal.connect(user1).createProposal("Test Vote", [{ targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" }]);
        const proposalId = 1;
        
        // Act: User votes without supplying a weight
        await hubAsProposal.connect(user1).vote(proposalId, true);

        // Assert
        const proposal = await hub.proposals(proposalId);
        expect(proposal.forVotes).to.equal(1);
    });

    it("Should correctly tally a passing proposal", async function () {
        await hubAsProposal.connect(owner).createProposal("Tally Pass Test", [{ targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" }]);
        const proposalId = 1;
        
        await hubAsProposal.connect(user1).vote(proposalId, true);
        await hubAsProposal.connect(user2).vote(proposalId, true);
        await hubAsProposal.connect(user3).vote(proposalId, false);

        await time.increase(VOTING_PERIOD + 1);
        await hubAsProposal.connect(owner).tallyProposal(proposalId);
        
        const proposalAfter = await hub.proposals(proposalId);
        expect(proposalAfter.status).to.equal(2); // Passed
    });
  });

  describe("Delegation Logic & Proxy Voting (Secure Registry)", function () {
    it("Should correctly add a user to a delegate's list", async function () {
        await hubAsDelegation.connect(user1).delegate(await user2.getAddress());
        
        expect(await hubAsDelegation.getDelegatorCount(await user2.getAddress())).to.equal(1);
        expect(await hubAsDelegation.getDelegatorAtIndex(await user2.getAddress(), 0)).to.equal(await user1.getAddress());
    });

    it("Should correctly remove a user on undelegate", async function () {
        await hubAsDelegation.connect(user1).delegate(await user2.getAddress());
        await hubAsDelegation.connect(user3).delegate(await user2.getAddress());
        
        await hubAsDelegation.connect(user1).undelegate();

        expect(await hubAsDelegation.getDelegatorCount(await user2.getAddress())).to.equal(1);
        const remainingDelegator = await hubAsDelegation.getDelegatorAtIndex(await user2.getAddress(), 0);
        expect(remainingDelegator).to.equal(await user3.getAddress());
    });
    
    it("Should allow a delegate to vote with the combined weight of themselves + delegators", async function () {
      // Arrange: user1 and user2 delegate to owner
      await hubAsDelegation.connect(user1).delegate(await owner.getAddress());
      await hubAsDelegation.connect(user2).delegate(await owner.getAddress());

      await hubAsProposal.connect(user1).createProposal("Proxy Vote Test", [{ targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" }]);
      const proposalId = 1;

      // Act: The owner (delegatee) votes by proxy. The list of delegators is read from storage.
      // THE FIX: Call the new voteByProxy with only two arguments.
      await hubAsProposal.connect(owner).voteByProxy(proposalId, true);

      // Assert
      const proposal = await hub.proposals(proposalId);
      // Weight = 1 (for the owner) + 2 (for the delegators)
      expect(proposal.forVotes).to.equal(3);
    });
  });

  describe("Delegation Logic (Enumerable Registry)", function () {
    it("Should correctly add a user to a delegate's list and update count", async function () {
        await hubAsDelegation.connect(user1).delegate(await user2.getAddress());
        
        expect(await hubAsDelegation.getDelegatorCount(await user2.getAddress())).to.equal(1);
        expect(await hubAsDelegation.getDelegatorAtIndex(await user2.getAddress(), 0)).to.equal(await user1.getAddress());
    });

    it("Should correctly remove a user using swap-and-pop on undelegate", async function () {
        await hubAsDelegation.connect(user1).delegate(await user2.getAddress());
        await hubAsDelegation.connect(user3).delegate(await user2.getAddress());
        
        expect(await hubAsDelegation.getDelegatorCount(await user2.getAddress())).to.equal(2);
        
        await hubAsDelegation.connect(user1).undelegate();

        expect(await hubAsDelegation.getDelegatorCount(await user2.getAddress())).to.equal(1);
        const remainingDelegator = await hubAsDelegation.getDelegatorAtIndex(await user2.getAddress(), 0);
        expect(remainingDelegator).to.equal(await user3.getAddress()); // User3 was moved into user1's old slot
    });

    it("Should correctly move a user when they change their delegate", async function () {
        await hubAsDelegation.connect(user1).delegate(await user2.getAddress());
        await hubAsDelegation.connect(user3).delegate(await user2.getAddress());

        await hubAsDelegation.connect(user1).delegate(await user3.getAddress());

        expect(await hubAsDelegation.getDelegatorCount(await user2.getAddress())).to.equal(1);
        expect(await hubAsDelegation.getDelegatorCount(await user3.getAddress())).to.equal(1);
        expect(await hubAsDelegation.getDelegatorAtIndex(await user3.getAddress(), 0)).to.equal(await user1.getAddress());
    });
  });

  describe("Proxy Voting (Secure and Trustless)", function () {
    beforeEach(async function() {
      // Setup: user1, user2, and user3 all delegate to the owner
      await hubAsDelegation.connect(user1).delegate(await owner.getAddress());
      await hubAsDelegation.connect(user2).delegate(await owner.getAddress());
      await hubAsDelegation.connect(user3).delegate(await owner.getAddress());
    });
    
    it("Should allow a delegate to vote with the combined weight of themselves + delegators", async function () {      
      await hubAsProposal.connect(user1).createProposal("Proxy Vote Test", [{ targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" }]);
      const proposalId = 1;

      // Act
      await hubAsProposal.connect(owner).voteByProxy(proposalId, true);

      // Assert
      const proposal = await hub.proposals(proposalId);
      expect(proposal.forVotes).to.equal(4); // 1 (owner) + 2 (delegators)
    });

    it("Should mark all delegators as having voted after a proxy vote", async function () {
      await hubAsProposal.connect(user1).createProposal("Proxy Vote State Test", [{ targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" }]);
      const proposalId = 1;
      
      await hubAsProposal.connect(owner).voteByProxy(proposalId, true);

      // Assert that the delegate and all delegators are now correctly marked as having voted
      expect(await hub.hasVoterVoted(proposalId, await owner.getAddress())).to.be.true;
      expect(await hub.hasVoterVoted(proposalId, await user1.getAddress())).to.be.true;
      expect(await hub.hasVoterVoted(proposalId, await user2.getAddress())).to.be.true;
      expect(await hub.hasVoterVoted(proposalId, await user3.getAddress())).to.be.true;
    });

    // in test/DotArbiter.test.ts

    it("Should prevent a delegator from voting directly", async function () {
      await hubAsDelegation.connect(user1).delegate(await owner.getAddress());
      await hubAsProposal.connect(user1).createProposal("Delegate Vote Block", [{ targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" }]);
      const proposalId = 1;

      await expect(hubAsProposal.connect(user1).vote(proposalId, true)).to.be.revertedWith("User has delegated their vote");
    });

    it("Should gracefully skip a delegator who has already voted directly, and not revert", async function () {
        // ARRANGE
        await hubAsProposal.connect(owner).createProposal("Vote then Delegate Test", [{ 
            targetParaId: 0, target: ethers.ZeroAddress, value: 0, calldata_: "0x", description: "" 
        }]);
        const proposalId = 1;

        // 2. User3 votes directly.
        await hubAsProposal.connect(user4).vote(proposalId, true);
        let proposal = await hub.proposals(proposalId);
        expect(proposal.forVotes).to.equal(1); // Vote count is 1

        // 3. AFTER voting, User3 also delegates to the Owner.
        await hubAsDelegation.connect(user4).delegate(await owner.getAddress());
        
        // At this point, the Owner has 4 delegators: user1, user2, user3 , user4.

        // ACT
        // 4. The Owner casts their proxy vote.
        // This transaction should SUCCEED.
        await expect(
            hubAsProposal.connect(owner).voteByProxy(proposalId, true)
        ).to.not.be.reverted;

        // ASSERT
        // 5. Check the final vote count.
        proposal = await hub.proposals(proposalId);
        // The final count should be:
        // 1 (from user3's original direct vote)
        // + 1 (from the owner's own vote)
        // + 1 (from user1's delegated vote)
        // + 1 (from user2's delegated vote)
        // User3's delegated vote was SKIPPED. Total = 4.
        expect(proposal.forVotes).to.equal(5);
        
        // Verify user4 is still marked as having voted, and their choice was not changed.
        expect(await hub.hasVoterVoted(proposalId, await user4.getAddress())).to.be.true;
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
        // Updated to use the new secure voting
        await hubAsProposal.connect(owner).vote(proposalId, true);
        await hubAsProposal.connect(user1).vote(proposalId, true);
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