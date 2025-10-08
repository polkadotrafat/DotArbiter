// frontend/src/utils/xcm-helpers.ts

import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN, u8aToHex } from '@polkadot/util';
import { ethers } from 'ethers';
import { Keyring } from '@polkadot/keyring';

const PASEO_RPC_URL = 'wss://rpc.ibp.network/paseo';

/**
 * Generates the full `calldata_` bytes for a system.remark XCM action on the Relay Chain.
 * @param remarkText The message to be posted on the destination chain.
 * @returns The final bytes payload to be used in the ProposalAction struct.
 */
export async function createRemarkXcmForDotArbiter(remarkText: string): Promise<string> {
  const api = await ApiPromise.create({ provider: new WsProvider(PASEO_RPC_URL) });

  // Destination for a remark is always the Relay Chain
  const destination = api.createType('VersionedMultiLocation', {
    V3: { parents: 1, interior: 'Here' },
  });

  // The call to be executed on the Relay Chain
  const remarkCall = api.registry.createType('Call', {
      callIndex: api.tx.system.remarkWithEvent.callIndex,
      args: [remarkText],
  });

  // The XCM program to execute the call
  const xcmMessage = api.createType('VersionedXcm', {
    V3: [{
        Transact: {
          originKind: 'SovereignAccount',
          requireWeightAtMost: { refTime: 1_000_000_000, proofSize: 50_000 },
          call: { encoded: remarkCall.toHex() },
        },
    }],
  });

  const messageBytes = xcmMessage.toU8a();
  const destinationBytes = destination.toU8a();
  await api.disconnect();

  // ABI-encode the two payloads together for our XcmExecutor contract
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
  const amountBn = new BN(amount.toString());

 
  const destination = api.createType('VersionedMultiLocation', {
    V3: { parents: 1, interior: 'Here' },
  });

  const keyring = new Keyring({ type: 'sr25519' });
  const recipientPublicKey = keyring.decodeAddress(recipientAddress);

  const assetToTransfer = {
    id: { Concrete: { parents: 1, interior: 'Here' } }, // The asset (PAS) is on the Relay Chain
    fun: { Fungible: amountBn },
  };
  const assetsToWithdraw = [assetToTransfer];

  const xcmMessage = api.createType('VersionedXcm', {
    V3: [
      { WithdrawAsset: assetsToWithdraw },
      {
        BuyExecution: {
          fees: assetToTransfer,
          weightLimit: 'Unlimited',
        },
      },
      {
        DepositAsset: {
          assets: { Wild: 'All' },
          beneficiary: {
            parents: 0, // The beneficiary is relative to the destination (the Relay Chain)
            interior: {
              X1: { AccountId32: { network: null, id: recipientPublicKey } }
            }
          }
        },
      },
    ],
  });

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