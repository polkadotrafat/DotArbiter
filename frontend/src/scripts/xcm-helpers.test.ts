// frontend/src/utils/xcm-helpers.test.ts

import { ApiPromise, WsProvider } from '@polkadot/api';
import { createRemarkXcmForDotArbiter, createTransferXcmForDotArbiter } from '../utils/xcm-helpers';
import { ethers } from 'ethers';
import { BN } from '@polkadot/util';

// --- JEST MOCK SETUP ---
// This tells Jest to replace the entire '@polkadot/api' module with our fake version.
jest.mock('@polkadot/api', () => ({
  // We only need to mock the parts of the library we actually use.
  ApiPromise: {
    create: jest.fn(), // Mock the main entry point
  },
  WsProvider: jest.fn(), // Mock the WsProvider constructor
}));

// --- TEST SUITE ---

describe('XCM Helper Functions', () => {
  // Define a reusable mock ApiPromise object
  let mockApi: any;

  beforeEach(() => {
    // Reset mocks before each test to ensure a clean state
    jest.clearAllMocks();
    
    // This is our fake ApiPromise instance. We define mock implementations for
    // the methods our helper functions will call.
    mockApi = {
      tx: {
        system: {
          // This will be called by the remark helper
          remarkWithEvent: jest.fn().mockReturnValue({
            toHex: () => '0x_mock_remark_call_hex', // Return a predictable hex string
          }),
        },
      },
      // This will be called by both helpers to create data structures
      createType: jest.fn((type, data) => {
        // Return a mock object that has a .toU8a() method
        return {
          toU8a: () => {
            // Return different predictable byte arrays based on what's being created
            if (type === 'VersionedMultiLocation' && data.V3.parents === 1) {
              return new Uint8Array([1, 1, 1]); // Mock destination bytes
            }
            if (type === 'VersionedXcm') {
              return new Uint8Array([2, 2, 2]); // Mock message bytes
            }
            return new Uint8Array([0]);
          },
        };
      }),
      disconnect: jest.fn().mockResolvedValue(undefined), // Mock the disconnect function
    };

    // Configure the mocked ApiPromise.create to resolve with our fake api object
    (ApiPromise.create as jest.Mock).mockResolvedValue(mockApi);
  });

  // --- Tests for createRemarkXcmForDotArbiter ---
  describe('createRemarkXcmForDotArbiter', () => {
    it('should generate a valid, ABI-encoded payload for a remark', async () => {
      const remarkText = 'Hello, Hackathon!';
      
      // Act: Call the function we are testing
      const result = await createRemarkXcmForDotArbiter(remarkText);

      // Assert: Check that the final output is correct
      const expectedDestinationBytes = '0x010101';
      const expectedMessageBytes = '0x020202';
      const expectedPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes', 'bytes'],
        [expectedDestinationBytes, expectedMessageBytes]
      );

      expect(result).toEqual(expectedPayload);
    });

    it('should call the Polkadot API with the correct arguments for a remark', async () => {
        const remarkText = 'Hello, Hackathon!';
        await createRemarkXcmForDotArbiter(remarkText);

        // Assert: Verify that our code interacted with the mock API as expected
        expect(ApiPromise.create).toHaveBeenCalled();
        expect(mockApi.tx.system.remarkWithEvent).toHaveBeenCalledWith(remarkText);
        expect(mockApi.createType).toHaveBeenCalledWith('VersionedMultiLocation', {
            V3: { parents: 1, interior: 'Here' },
        });
        expect(mockApi.createType).toHaveBeenCalledWith('VersionedXcm', expect.any(Object)); // Check that it was called
        expect(mockApi.disconnect).toHaveBeenCalled();
    });
  });

  // --- Tests for createTransferXcmForDotArbiter ---
  describe('createTransferXcmForDotArbiter', () => {
    it('should generate a valid, ABI-encoded payload for a token transfer', async () => {
        const recipientAddress = '14uWAHq7bSbj7d5yn4N7oZYdDEaNxcUgAqqVF2MZiGuv3mNN';
        const amount = 10000000000n; // 1 PAS in plancks

        // Act
        const result = await createTransferXcmForDotArbiter(recipientAddress, amount);
        
        // Assert: Check the final output
        const expectedDestinationBytes = '0x010101';
        const expectedMessageBytes = '0x020202';
        const expectedPayload = ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes', 'bytes'],
            [expectedDestinationBytes, expectedMessageBytes]
        );
        expect(result).toEqual(expectedPayload);
    });

    it('should call the Polkadot API with the correct arguments for a transfer', async () => {
        const recipientAddress = '14uWAHq7bSbj7d5yn4N7oZYdDEaNxcUgAqqVF2MZiGuv3mNN';
        const amount = 10000000000n; // 1 PAS
        
        await createTransferXcmForDotArbiter(recipientAddress, amount);
        
        // Assert
        expect(ApiPromise.create).toHaveBeenCalled();

        // Check that createType was called to construct the beneficiary correctly
        expect(mockApi.createType).toHaveBeenCalledWith('VersionedMultiLocation', {
            V3: { parents: 0, interior: { X1: { AccountId32: { network: null, id: recipientAddress } } } },
        });
        
        // Check that createType was called to construct the asset correctly
        expect(mockApi.createType).toHaveBeenCalledWith('VersionedMultiAssets', {
            V3: [{ id: { Concrete: { parents: 1, interior: 'Here' } }, fun: { Fungible: new BN(amount.toString()) } }],
        });

        expect(mockApi.disconnect).toHaveBeenCalled();
    });
  });
});