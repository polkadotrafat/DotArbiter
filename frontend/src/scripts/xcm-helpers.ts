import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN, u8aToHex } from '@polkadot/util';
import { ethers } from 'ethers';

// This is the RPC endpoint for the Paseo Relay Chain, the destination for our remarks.
const PASEO_RPC_URL = 'wss://rpc.ibp.network/paseo';

/**
 * Generates the full `calldata_` bytes for a system.remark XCM action.
 * @param remarkText The message to be posted on the destination chain.
 * @returns The final bytes payload to be used in the ProposalAction struct.
 */
export async function createRemarkXcmForDotArbiter(remarkText: string): Promise<string> {
  const api = await ApiPromise.create({ provider: new WsProvider(PASEO_RPC_URL) });

  // 1. Construct the XCM `message` (the instructions)
  const remarkCall = api.tx.system.remarkWithEvent(remarkText);
  const xcmMessage = {
    V3: [{
        Transact: {
          originKind: 'SovereignAccount',
          requireWeightAtMost: { refTime: 1_000_000_000, proofSize: 50_000 },
          call: { encoded: remarkCall.toHex() },
        },
    }],
  };
  const messageBytes = api.createType('VersionedXcm', xcmMessage).toU8a();

  // 2. Construct the XCM `destination` (where the message is going)
  const destinationLocation = { V3: { parents: 1, interior: 'Here' } };
  const destinationBytes = api.createType('VersionedMultiLocation', destinationLocation).toU8a();

  await api.disconnect();

  // 3. ABI-encode the two payloads together for our XcmExecutor contract
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes', 'bytes'],
    [u8aToHex(destinationBytes), u8aToHex(messageBytes)]
  );
}

/**
 * Creates the complete `calldata_` payload for a proposal action that transfers
 * the Relay Chain's native token (PAS) from the DAO's Sovereign Account on the
 * Relay Chain to a specified beneficiary address.
 *
 * @param recipientAddress A standard Substrate address string (e.g., "14uWAH...")
 * @param amount The amount of the token to transfer, in its smallest unit (plancks).
 * @returns A single hex string for the XcmExecutor.sol contract.
 */
export async function createTransferXcmForDotArbiter(
  recipientAddress: string,
  amount: bigint
): Promise<string> {
  const api = await ApiPromise.create({ provider: new WsProvider(PASEO_RPC_URL) });
  
  // Convert BigInt to BN for Polkadot.js compatibility
  const amountBn = new BN(amount.toString());

  // --- STEP 1: Define the DESTINATION of the XCM message ---
  // The message itself is going TO the Relay Chain to be executed there.
  const destination = api.createType('VersionedMultiLocation', {
    V3: { parents: 1, interior: 'Here' },
  });

  // --- STEP 2: Define the MESSAGE (the transfer instructions) ---
  
  // Define the beneficiary (who gets the funds) as a MultiLocation
  const beneficiary = api.createType('VersionedMultiLocation', {
    V3: {
      parents: 0,
      interior: {
        X1: { AccountId32: { network: null, id: recipientAddress } },
      },
    },
  });

  // Define the asset to be transferred (the Relay Chain's native token)
  const assetToTransfer = api.createType('VersionedMultiAssets', {
    V3: [{
        id: { Concrete: { parents: 1, interior: 'Here' } },
        fun: { Fungible: amountBn },
    }],
  });
  
  // Construct the XCM program
  const xcmMessage = api.createType('VersionedXcm', {
    V3: [
      // Instruction 1: Withdraw the asset from the context (our Sovereign Account).
      {
        WithdrawAsset: assetToTransfer,
      },
      // Instruction 2: Pay for execution fees on the Relay Chain using a portion
      // of the asset we just withdrew. This is a robust pattern.
      {
        BuyExecution: {
          fees: {
            id: { Concrete: { parents: 1, interior: 'Here' } },
            fun: { Fungible: new BN('200000000') }, // A reasonable fee, e.g., 0.02 PAS
          },
          weightLimit: 'Unlimited',
        },
      },
      // Instruction 3: Deposit the *remaining* asset into the beneficiary's account.
      // `Wild(All)` is a wildcard that means "all of the asset we are currently holding".
      {
        DepositAsset: {
          assets: { Wild: 'All' },
          beneficiary: beneficiary,
        },
      },
    ],
  });

  // --- STEP 3 & 4: SCALE-encode and ABI-encode for Solidity ---
  const destinationBytes = destination.toU8a();
  const messageBytes = xcmMessage.toU8a();
  await api.disconnect();

  const finalCalldata = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes', 'bytes'],
    [u8aToHex(destinationBytes), u8aToHex(messageBytes)]
  );

  console.log("Successfully generated XCM payload for token transfer.");
  return finalCalldata;
}
