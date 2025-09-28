// frontend/src/utils/xcm-helpers.ts

import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN, u8aToHex } from '@polkadot/util';
import { ethers } from 'ethers';
import { Keyring } from '@polkadot/keyring';

const PASEO_RPC_URL = 'wss://rpc.ibp.network/paseo';

async function createXcm(targetParaId: number, encodedCall: `0x${string}`): Promise<string> {
  const api = await ApiPromise.create({ provider: new WsProvider(PASEO_RPC_URL) });

  const destination = api.createType('VersionedMultiLocation', {
    V3: {
      parents: 1,
      interior: targetParaId === 0 ? 'Here' : { X1: { Parachain: targetParaId } },
    },
  });

  const xcmMessage = api.createType('VersionedXcm', {
    V3: [{
        Transact: {
          originKind: 'SovereignAccount',
          requireWeightAtMost: { refTime: 1_000_000_000, proofSize: 50_000 },
          call: { encoded: encodedCall },
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

export async function createRemarkXcmForDotArbiter(remarkText: string): Promise<string> {
  const api = await ApiPromise.create({ provider: new WsProvider(PASEO_RPC_URL) });
  const remarkCall = api.registry.createType('Call', {
      callIndex: api.tx.system.remarkWithEvent.callIndex,
      args: [remarkText],
  });
  await api.disconnect();
  return createXcm(0, remarkCall.toHex() as `0x${string}`);
}

export async function createTransferXcmForDotArbiter(
  targetParaId: number,
  recipientAddress: string,
  amount: bigint
): Promise<string> {
  const api = await ApiPromise.create({ provider: new WsProvider(PASEO_RPC_URL) });
  const amountBn = new BN(amount.toString());

  const destination = api.createType('VersionedMultiLocation', {
    V3: {
      parents: 1,
      interior: targetParaId === 0 ? 'Here' : { X1: { Parachain: targetParaId } },
    },
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
          beneficiary: {
            parents: 0,
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
