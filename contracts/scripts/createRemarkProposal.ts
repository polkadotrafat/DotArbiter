// scripts/createRemarkProposal.ts

import { ethers } from "hardhat";
import GovernanceHubArtifact from "../artifacts/contracts/GovernanceHub.sol/GovernanceHub.json";
import ProposalLogicArtifact from "../artifacts/contracts/ProposalLogic.sol/ProposalLogic.json";
import { createRemarkXcmForDotArbiter } from "../../frontend/src/utils/xcm-helpers";

const HUB_ADDRESS = "0x0fD55d06B382C72d8b95f5Bf9Ae1682D079B79bB"; 
const REMARK_TEXT = `DotArbiter programmatic proposal @ ${new Date().toISOString()}`;

async function main() {
  console.log("🚀 Starting script to create an XCM Remark Proposal...");

  const [signer] = await ethers.getSigners();
  console.log(`Using signer: ${signer.address}`);

  const governanceHubAbi = GovernanceHubArtifact.abi;
  const hub = new ethers.Contract(HUB_ADDRESS, governanceHubAbi, signer);
  console.log(`Connected to GovernanceHub at ${HUB_ADDRESS}`);

  console.log(`Generating XCM payload for remark: "${REMARK_TEXT}"...`);
  const xcmCalldata = await createRemarkXcmForDotArbiter(REMARK_TEXT);
  console.log("✅ Payload generated successfully.");

  const proposalDescription = "Programmatic XCM Remark Test";
  const actions = [[0, ethers.ZeroAddress, 0, xcmCalldata, "Post a message on the Relay Chain"]];

  console.log("Submitting createProposal transaction...");
  const tx = await hub.createProposal(proposalDescription, actions);
  
  console.log(`Transaction sent! Waiting for confirmation... Tx Hash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed!");

  // --- FIX APPLIED HERE ---
  // We will now safely find and parse the event.

  const proposalLogicAbi = ProposalLogicArtifact.abi;
  const hubInterface = new ethers.Interface(proposalLogicAbi);
  let proposalIdFound = false;

  // Loop through all logs in the receipt
  for (const log of receipt.logs) {
    try {
      // Try to parse each log with our interface
      const parsedLog = hubInterface.parseLog({ topics: log.topics as string[], data: log.data });

      // If parsing is successful AND it's the event we want, process it.
      if (parsedLog && parsedLog.name === 'ProposalCreated') {
        const proposalId = parsedLog.args[0];
        console.log(`\n🎉 Proposal #${proposalId} has been successfully created on-chain!`);
        proposalIdFound = true;
        break; // Exit the loop once we've found our event
      }
    } catch (error) {
      // This log might not be from our contract, so we can safely ignore parse errors
    }
  }

  if (!proposalIdFound) {
    console.warn("Could not find ProposalCreated event in transaction logs.");
  }
  // --- END OF FIX ---

  console.log("\n🏁 Script finished.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});