// frontend/src/utils/xcm-helpers.integration.test.ts

import { ApiPromise, WsProvider } from '@polkadot/api';
// --- NEW IMPORTS: Import the specific types we need ---
import type { VersionedXcm, VersionedMultiLocation } from '@polkadot/types/interfaces';
import { Bytes } from '@polkadot/types';
// --- END NEW IMPORTS ---
import { createRemarkXcmForDotArbiter, createTransferXcmForDotArbiter } from '../utils/xcm-helpers';
import { ethers } from 'ethers';
import { BN } from '@polkadot/util';

jest.setTimeout(30000);

describe('XCM Helper Functions (Integration)', () => {
  let api: ApiPromise;

  beforeAll(async () => {
    const provider = new WsProvider('wss://rpc.ibp.network/paseo');
    api = await ApiPromise.create({ provider });
  });

  afterAll(async () => {
    await api.disconnect();
  });

  describe('createRemarkXcmForDotArbiter', () => {
    it('should generate a structurally valid payload that can be decoded by a live API instance', async () => {
      const remarkText = 'Live Test: Hello DotArbiter!';
      const payloadHex = await createRemarkXcmForDotArbiter(remarkText);

      const [destinationHex, messageHex] = ethers.AbiCoder.defaultAbiCoder().decode(
        ['bytes', 'bytes'],
        payloadHex
      );
      
      // FIX: Cast the decoded objects to their specific types
      const decodedDestination = api.createType('VersionedMultiLocation', destinationHex) as VersionedMultiLocation;
      const decodedMessage = api.createType('VersionedXcm', messageHex) as VersionedXcm;

      // Assert destination (now correctly typed)
      expect(decodedDestination.isV3).toBe(true);
      const destAsV3 = decodedDestination.asV3;
      expect(destAsV3.parents.toNumber()).toBe(1);
      expect(destAsV3.interior.isHere).toBe(true);
      
      // Assert message (now correctly typed)
      expect(decodedMessage.isV3).toBe(true);
      const instructions = decodedMessage.asV3;
      expect(instructions).toHaveLength(1);

      const transactInstruction = instructions[0];
      expect(transactInstruction.isTransact).toBe(true);
      
      const remarkCall = api.createType('Call', transactInstruction.asTransact.call.encoded);
      expect(remarkCall.section).toBe('system');
      expect(remarkCall.method).toBe('remarkWithEvent');
      expect((remarkCall.args[0] as Bytes).toUtf8()).toEqual(remarkText);
    });
  });

  describe('createTransferXcmForDotArbiter', () => {
    it('should generate a structurally valid payload for a PAS transfer', async () => {
      const recipientAddress = '14uWAHq7bSbj7d5yn4N7oZYdDEaNxcUgAqqVF2MZiGuv3mNN';
      const amount = 1_500_000_000n; // 0.15 PAS

      const payloadHex = await createTransferXcmForDotArbiter(recipientAddress, amount);

      const [destinationHex, messageHex] = ethers.AbiCoder.defaultAbiCoder().decode(
        ['bytes', 'bytes'],
        payloadHex
      );
      
      // FIX: Cast the decoded objects to their specific types
      const decodedDestination = api.createType('VersionedMultiLocation', destinationHex) as VersionedMultiLocation;
      const decodedMessage = api.createType('VersionedXcm', messageHex) as VersionedXcm;

      // Assert destination
      expect(decodedDestination.isV3).toBe(true);
      expect(decodedDestination.asV3.parents.toNumber()).toBe(1);

      // Assert message
      expect(decodedMessage.isV3).toBe(true);
      const instructions = decodedMessage.asV3;
      expect(instructions).toHaveLength(3);

      // Check Instruction 1: WithdrawAsset
      const withdrawInstruction = instructions[0];
      expect(withdrawInstruction.isWithdrawAsset).toBe(true);
      const withdrawnAsset = withdrawInstruction.asWithdrawAsset[0]; // Note: WithdrawAsset returns a Vec<MultiAsset>
      expect(withdrawnAsset.id.asConcrete.parents.toNumber()).toBe(1);
      expect(withdrawnAsset.fun.asFungible.toBigInt()).toEqual(amount);

      // Check Instruction 2: BuyExecution
      const buyExecutionInstruction = instructions[1];
      expect(buyExecutionInstruction.isBuyExecution).toBe(true);

      // Check Instruction 3: DepositAsset
      const depositInstruction = instructions[2];
      expect(depositInstruction.isDepositAsset).toBe(true);
      const beneficiary = depositInstruction.asDepositAsset.beneficiary;
      
      expect(beneficiary.parents.toNumber()).toBe(0);
      expect(beneficiary.interior.isX1).toBe(true);
      const accountJunction = beneficiary.interior.asX1;
      expect(accountJunction.isAccountId32).toBe(true);
      expect(accountJunction.asAccountId32.id.toHex()).toEqual(api.createType('AccountId32', recipientAddress).toHex());
    });
  });
});