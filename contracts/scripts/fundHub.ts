// contracts/scripts/fundHub.ts

import { ethers } from "hardhat";

// ============================================================================
// --- CONFIGURATION ---
// ============================================================================
// The address of your deployed GovernanceHub contract.
const HUB_ADDRESS = "0xcb16bce605CC8E56645FaC1Eb9df9760d76633A7";

// The amount of UNIT tokens to send. UNIT has 18 decimals.
// Use a string for readability and to avoid floating point errors.
const AMOUNT_TO_SEND = "50.0";
// ============================================================================

async function main() {
  console.log("🚀 Starting script to fund the GovernanceHub contract...");

  // 1. Get the signer account from your hardhat.config.ts
  const [signer] = await ethers.getSigners();
  console.log(`Using signer account: ${signer.address}`);

  // 2. Check the signer's current balance (pre-flight check)
  const signerBalance = await ethers.provider.getBalance(signer.address);
  console.log(`Signer's current balance: ${ethers.formatEther(signerBalance)} UNIT`);

  const amountToSendWei = ethers.parseUnits(AMOUNT_TO_SEND, 18);

  // 3. Verify the signer has enough funds to complete the transaction
  if (signerBalance < amountToSendWei) {
    console.error("\n❌ Error: Signer balance is too low.");
    console.error(`   - Current balance: ${ethers.formatEther(signerBalance)} UNIT`);
    console.error(`   - Amount to send:  ${AMOUNT_TO_SEND} UNIT`);
    console.error("\nPlease fund your signer account from a Paseo Asset Hub faucet first.");
    process.exit(1);
  }

  // 4. Send the transaction
  console.log(`\n💸 Sending ${AMOUNT_TO_SEND} UNIT to GovernanceHub at ${HUB_ADDRESS}...`);
  const tx = await signer.sendTransaction({
    to: HUB_ADDRESS,
    value: amountToSendWei,
  });

  console.log(`Transaction sent! Waiting for confirmation...`);
  console.log(`   - Tx Hash: ${tx.hash}`);

  // 5. Wait for the transaction to be mined and confirmed
  await tx.wait();
  console.log("✅ Transaction confirmed!");

  // 6. Verify the final balance of the GovernanceHub contract
  const hubBalance = await ethers.provider.getBalance(HUB_ADDRESS);
  console.log(`\n🎉 Success! GovernanceHub now has a balance of ${ethers.formatEther(hubBalance)} UNIT.`);
  
  console.log("\n🏁 Script finished.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});