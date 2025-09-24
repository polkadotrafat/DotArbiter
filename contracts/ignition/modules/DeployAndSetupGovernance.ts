import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployAndSetupGovernanceModule = buildModule("DeployAndSetupGovernance", (m) => {
  // Deploy the implementation contracts first
  const proposalLogic = m.contract("ProposalLogic");
  const delegationLogic = m.contract("DelegationLogic");
  const xcmExecutor = m.contract("XcmExecutor");

  // Deploy the Governance Hub (proxy contract)
  const governanceHub = m.contract("GovernanceHub");

  // Setup the implementations
  const proposalLogicSelectors = [
    "0xc7f758a8", // createProposal(string,(uint32,address,uint256,bytes,string)[])
    "0xc9c18f89", // vote(uint256,bool,uint256)
    "0x35657447", // voteByProxy(uint256,bool,address[],uint256[])
    "0xd46a5d7e", // tallyProposal(uint256)
    "0x7daff299", // getProposal(uint256)
  ];

  const delegationLogicSelectors = [
    "0x5c19a95c", // delegate(address)
    "0xda35c664", // undelegate()
    "0x544d8564", // getDelegate(address)
    "0x90ae9337", // hasDelegated(address)
  ];

  const xcmExecutorSelectors = [
    "0xb3b3a232", // executeProposal(uint256)
    "0x0d61b519", // estimateXcmWeight(bytes)
    "0x4f4a7e88", // isXcmAvailable()
    "0x9a82171b", // encodeParachainDestination(uint32)
  ];

  const allSelectors = [
    ...proposalLogicSelectors,
    ...delegationLogicSelectors,
    ...xcmExecutorSelectors,
  ];

  const allImplementations = [
    ...Array(proposalLogicSelectors.length).fill(proposalLogic),
    ...Array(delegationLogicSelectors.length).fill(delegationLogic),
    ...Array(xcmExecutorSelectors.length).fill(xcmExecutor),
  ];

  m.call(governanceHub, "setImplementations", [allSelectors, allImplementations]);

  return { governanceHub, proposalLogic, delegationLogic, xcmExecutor };
});

export default DeployAndSetupGovernanceModule;
