// scripts/createRemarkProposal.ts

import { ethers } from "hardhat";
// We still need the Hub artifact for its address, but not its ABI for this call
import GovernanceHubArtifact from "../artifacts/contracts/GovernanceHub.sol/GovernanceHub.json"; 
// FIX: Import the ABI of the LOGIC contract we want to call
import ProposalLogicArtifact from "../artifacts/contracts/ProposalLogic.sol/ProposalLogic.json";
const { createRemarkXcmForDotArbiter } = require("./xcm-helpers");

const HUB_ADDRESS = "0x0fD55d06B382C72d8b95f5Bf9Ae1682D079B79bB"; 
const REMARK_TEXT = `DotArbiter programmatic proposal @ ${new Date().toISOString()}`;

async function main() {
  console.log("🚀 Starting script to create an XCM Remark Proposal...");

  const [signer] = await ethers.getSigners();
  console.log(`Using signer: ${signer.address}`);

  // FIX: Get the ABI for the ProposalLogic contract
  const proposalLogicAbi = ProposalLogicArtifact.abi;

  // FIX: Create the contract instance using the HUB's ADDRESS but the LOGIC's ABI
  const hubAsProposalLogic = new ethers.Contract(HUB_ADDRESS, proposalLogicAbi, signer);
  console.log(`Connected to GovernanceHub (via ProposalLogic ABI) at ${HUB_ADDRESS}`);

  console.log(`Generating XCM payload for remark: "${REMARK_TEXT}"...`);
  const xcmCalldata = await createRemarkXcmForDotArbiter(REMARK_TEXT);
  console.log("✅ Payload generated successfully.");

  const proposalDescription = "Programmatic XCM Remark Test";
  const actions = [[0, ethers.ZeroAddress, 0, xcmCalldata, "Post a message on the Relay Chain"]];

  console.log("Submitting createProposal transaction...");
  // FIX: Call the function on the correctly configured contract instance
  const tx = await hubAsProposalLogic.createProposal(proposalDescription, actions);
  
  console.log(`Transaction sent! Waiting for confirmation... Tx Hash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed!");

  // The event parsing logic is already correct because it was using the proposalLogicAbi
  const hubInterface = new ethers.Interface(proposalLogicAbi);
  let proposalIdFound = false;

  for (const log of receipt.logs) {
    try {
      const parsedLog = hubInterface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsedLog && parsedLog.name === 'ProposalCreated') {
        const proposalId = parsedLog.args[0];
        console.log(`\n🎉 Proposal #${proposalId} has been successfully created on-chain!`);
        proposalIdFound = true;
        break;
      }
    } catch (error) { /* Ignore other events */ }
  }

  if (!proposalIdFound) {
    console.warn("Could not find ProposalCreated event in transaction logs.");
  }

  console.log("\n🏁 Script finished.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});