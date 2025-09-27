import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";
// We need to import the `artifacts` object from Hardhat itself
import hre from "hardhat";

// ============================================================================
// --- Step 1: Define the Helper Function (Outside the Module) ---
// ============================================================================
const getSelectors = (abi: any[]): string[] => {
  const anInterface = new ethers.Interface(abi);
  const selectors: string[] = [];
  anInterface.forEachFunction((func) => {
    selectors.push(func.selector);
  });
  return selectors;
};


// ============================================================================
// --- Step 2: Prepare All Data *Before* Building the Module ---
// ============================================================================
// HRE (Hardhat Runtime Environment) gives us access to the compiled artifacts
const proposalLogicArtifact = hre.artifacts.readArtifactSync("ProposalLogic");
const delegationLogicArtifact = hre.artifacts.readArtifactSync("DelegationLogic");
const xcmExecutorArtifact = hre.artifacts.readArtifactSync("XcmExecutor");

const proposalSelectors = getSelectors(proposalLogicArtifact.abi);
const delegationSelectors = getSelectors(delegationLogicArtifact.abi);
const xcmExecutorSelectors = getSelectors(xcmExecutorArtifact.abi);


// ============================================================================
// --- Step 3: Build the Module Using the Pre-calculated Data ---
// ============================================================================
const DeployAndSetupGovernanceModule = buildModule("DeployAndSetupGovernance", (m) => {
  // 1. Deploy contracts (same as before)
  const proposalLogic = m.contract("ProposalLogic");
  const delegationLogic = m.contract("DelegationLogic");
  const xcmExecutor = m.contract("XcmExecutor");
  const governanceHub = m.contract("GovernanceHub");

  // 2. Combine all selectors and implementations into single arrays
  const allSelectors = [
    ...proposalSelectors,
    ...delegationSelectors,
    ...xcmExecutorSelectors,
  ];

  const allImplementations = [
    ...proposalSelectors.map(() => proposalLogic),
    ...delegationSelectors.map(() => delegationLogic),
    ...xcmExecutorSelectors.map(() => xcmExecutor),
  ];

  // 3. Make a single, unambiguous call to setImplementations
  m.call(governanceHub, "setImplementations", [allSelectors, allImplementations]);

  return { governanceHub, proposalLogic, delegationLogic, xcmExecutor };
});

export default DeployAndSetupGovernanceModule;