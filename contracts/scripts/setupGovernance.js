// scripts/setupGovernance.js
// This script sets up the function selector mappings for the GovernanceHub

const { ethers } = require("hardhat");

async function main() {
  // Get the deployed contract addresses
  const governanceHubAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const proposalLogicAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const delegationLogicAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const xcmExecutorAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  // Get contract instances
  const GovernanceHub = await ethers.getContractFactory("GovernanceHub");
  const hub = GovernanceHub.attach(governanceHubAddress);

  const ProposalLogic = await ethers.getContractFactory("ProposalLogic");
  const proposalLogic = ProposalLogic.attach(proposalLogicAddress);

  const DelegationLogic = await ethers.getContractFactory("DelegationLogic");
  const delegationLogic = DelegationLogic.attach(delegationLogicAddress);

  const XcmExecutor = await ethers.getContractFactory("XcmExecutor");
  const xcmExecutor = XcmExecutor.attach(xcmExecutorAddress);

  // Get all function selectors from each contract
  console.log("Getting ProposalLogic function selectors...");
  const proposalSelectors = [];
  const proposalInterface = new ethers.Interface(proposalLogic.interface.format());
  for (const func of proposalInterface.fragments) {
    if (func.type === 'function') {
      proposalSelectors.push(func.selector);
    }
  }

  console.log("Getting DelegationLogic function selectors...");
  const delegationSelectors = [];
  const delegationInterface = new ethers.Interface(delegationLogic.interface.format());
  for (const func of delegationInterface.fragments) {
    if (func.type === 'function') {
      delegationSelectors.push(func.selector);
    }
  }

  console.log("Getting XcmExecutor function selectors...");
  const xcmSelectors = [];
  const xcmInterface = new ethers.Interface(xcmExecutor.interface.format());
  for (const func of xcmInterface.fragments) {
    if (func.type === 'function') {
      xcmSelectors.push(func.selector);
    }
  }

  console.log("Setting up Proposal Logic implementations...");
  if (proposalSelectors.length > 0) {
    await hub.setImplementations(
      proposalSelectors,
      Array(proposalSelectors.length).fill(proposalLogicAddress)
    );
    console.log(`Set ${proposalSelectors.length} proposal function selectors`);
  }

  console.log("Setting up Delegation Logic implementations...");
  if (delegationSelectors.length > 0) {
    await hub.setImplementations(
      delegationSelectors,
      Array(delegationSelectors.length).fill(delegationLogicAddress)
    );
    console.log(`Set ${delegationSelectors.length} delegation function selectors`);
  }

  console.log("Setting up XCM Executor implementations...");
  if (xcmSelectors.length > 0) {
    await hub.setImplementations(
      xcmSelectors,
      Array(xcmSelectors.length).fill(xcmExecutorAddress)
    );
    console.log(`Set ${xcmSelectors.length} XCM function selectors`);
  }

  console.log("GovernanceHub setup completed!");
  console.log("GovernanceHub address:", await hub.getAddress());
  console.log("ProposalLogic address:", await proposalLogic.getAddress());
  console.log("DelegationLogic address:", await delegationLogic.getAddress());
  console.log("XcmExecutor address:", await xcmExecutor.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });