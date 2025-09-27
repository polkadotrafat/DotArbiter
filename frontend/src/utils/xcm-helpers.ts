// frontend/src/utils/xcm-helpers.ts

import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN, u8aToHex } from '@polkadot/util';
import { ethers } from 'ethers';
// Import the keyring for address decoding
import { Keyring } from '@polkadot/keyring';

const PASEO_RPC_URL = 'wss://rpc.ibp.network/paseo';

export async function createRemarkXcmForDotArbiter(remarkText: string): Promise<string> {
  const api = await ApiPromise.create({ provider: new WsProvider(PASEO_RPC_URL) });

  const destination = api.createType('VersionedMultiLocation', {
    V3: { parents: 1, interior: 'Here' },
  });

  // FIX for Remark: Instead of creating a full tx object, we just need the encoded call.
  // This is more direct and less prone to context errors.
  const remarkCall = api.registry.createType('Call', {
      callIndex: api.tx.system.remarkWithEvent.callIndex,
      args: [remarkText],
  });

  const xcmMessage = api.createType('VersionedXcm', {
    V3: [{
        Transact: {
          originKind: 'SovereignAccount',
          requireWeightAtMost: { refTime: 1_000_000_000, proofSize: 50_000 },
          call: { encoded: remarkCall.toHex() }, // Pass the correctly encoded call
        },
    }],
  });
  
  const messageBytes = xcmMessage.toU8a();
  const destinationBytes = destination.toU8a();
  await api.disconnect();

  return ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes', 'bytes'],
    [u8aToHex(destinationBytes), u8aToHex(messageBytes)]
  );
}


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
    id: { Concrete: { parents: 1, interior: 'Here' } },
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
          // --- THE FIX IS HERE ---
          // Instead of passing a pre-made Codec object, we pass the plain
          // JavaScript object that describes the MultiLocation directly.
          beneficiary: {
            parents: 0,
            interior: {
              X1: { AccountId32: { network: null, id: recipientPublicKey } }
            }
          }
          // --- END OF FIX ---
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