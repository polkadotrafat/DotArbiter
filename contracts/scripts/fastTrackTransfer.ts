import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import ProposalLogicArtifact from "../artifacts/contracts/ProposalLogic.sol/ProposalLogic.json";
import XcmExecutorArtifact from "../artifacts/contracts/XcmExecutor.sol/XcmExecutor.json";
// Import your REAL, TESTED helper function
const { createTransferXcmForDotArbiter } = require("./xcm-helpers");

// ============================================================================
// --- CONFIGURATION ---
// ============================================================================
const HUB_ADDRESS = "0xcb16bce605CC8E56645FaC1Eb9df9760d76633A7"; // Your deployed GovernanceHub
const RECIPIENT_ADDRESS = "12ixQYezQwvBqzAn8iLhWfKZ1MbSx4gwoguxMBnnffZQkMcz"; // A test Substrate address to receive funds
const TRANSFER_AMOUNT_PAS = "11"; // The amount of PAS to send (human readable)
// ============================================================================

async function main() {
  console.log("🚀 Starting fast-track XCM TRANSFER proposal script...");

  const [signer] = await ethers.getSigners();
  const proposalLogicAbi = ProposalLogicArtifact.abi;
  const xcmExecutorAbi = XcmExecutorArtifact.abi;

  const hubAsProposal = new ethers.Contract(HUB_ADDRESS, proposalLogicAbi, signer);
  const hubAsXcm = new ethers.Contract(HUB_ADDRESS, xcmExecutorAbi, signer);

  // --- 1. Generate the XCM Payload ---
  const amountInPlancks = ethers.parseUnits(TRANSFER_AMOUNT_PAS, 10); // PAS has 10 decimals
  console.log(`📝 Generating payload to transfer ${TRANSFER_AMOUNT_PAS} PAS to ${RECIPIENT_ADDRESS}`);
  const calldata = await createTransferXcmForDotArbiter(RECIPIENT_ADDRESS, amountInPlancks);
  
  // --- 2. Create the Proposal ---
  const description = `Pay ${TRANSFER_AMOUNT_PAS} PAS to contributor`;
  const actions = [[0, ethers.ZeroAddress, 0, calldata, `XCM Transfer of ${TRANSFER_AMOUNT_PAS} PAS`]];
  const createTx = await hubAsProposal.createProposal(description, actions);
  const receipt = await createTx.wait();
  const hubInterface = new ethers.Interface(proposalLogicAbi);
  const eventLog = receipt.logs.find((log: any) => hubInterface.parseLog({ topics: log.topics as string[], data: log.data })?.name === 'ProposalCreated');
  const proposalId = eventLog.args[0];
  console.log(`✅ Proposal #${proposalId} created. Tx: ${createTx.hash}`);

  // --- 3. Vote, Time Travel, Tally, Execute (The Fast-Track part) ---
  console.log(`🗳️  Voting 'FOR' on proposal #${proposalId}...`);
  await (await hubAsProposal.vote(proposalId, true, ethers.parseEther("1000"))).wait();

  const VOTING_PERIOD = 7 * 24 * 60 * 60;
  console.log(`⏳ Fast-forwarding time by ${VOTING_PERIOD / 3600} hours...`);
  await time.increase(VOTING_PERIOD + 1);

  console.log(`📊 Tallying proposal #${proposalId}...`);
  await (await hubAsProposal.tallyProposal(proposalId)).wait();

  console.log(`⚡ Executing proposal #${proposalId}...`);
  const executeTx = await hubAsXcm.executeProposal(proposalId);
  await executeTx.wait();
  console.log(`✅ Proposal executed! Tx: ${executeTx.hash}`);
  console.log("🏁 Script finished. Now, go verify on the block explorers!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});