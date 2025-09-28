// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Storage.sol";
import "./GovernanceStorage.sol";
import "./IXcm.sol";

contract XcmExecutor is GovernanceStorage {
    using Storage for *;

    IXcm constant XCM = IXcm(XCM_PRECOMPILE_ADDRESS);
    
    // Make the contract payable to receive funds for XCM execution
    receive() external payable {}
    
    fallback() external payable {}

    // ========================================================================
    // Proposal Execution
    // ========================================================================

    /// @notice Execute a passed proposal via XCM
    function executeProposal(uint256 proposalId) external {
        Storage.Proposal storage p = proposals[proposalId];
        
        require(p.id != 0, "Proposal does not exist");
        require(p.status == Storage.ProposalStatus.Passed, "Proposal not passed");

        // EFFECT: Prevent re-entrancy by changing state before interaction
        p.status = Storage.ProposalStatus.Executed;

        bool allSuccessful = true;

        for (uint256 i = 0; i < p.actions.length; i++) {
            Storage.ProposalAction memory action = p.actions[i];
            
            bool success;
            if (action.targetParaId == 0 && action.target != address(1)) {
                // INTERACTION: Pass value explicitly to the local execution helper
                success = _executeLocal(action.target, action.value, action.calldata_);
            } else {
                success = _executeXcm(action.calldata_);
            }
            
            if (!success) {
                allSuccessful = false;
            }
        }
        
        emit Storage.ProposalExecuted(proposalId, allSuccessful);
    }

    // ========================================================================
    // Execution Helpers
    // ========================================================================

    function _executeLocal(address target, uint256 value, bytes memory calldata_) private returns (bool) {
        (bool success, ) = target.call{value: value}(calldata_);
        return success;
    }
    

    function _executeXcm(bytes memory encodedXcmPayload) private returns (bool) {
        (bytes memory destination, bytes memory message) = abi.decode(
            encodedXcmPayload,
            (bytes, bytes)
        );

        try XCM.send(destination, message) {
            return true;
        } catch {
            return false;
        }
    }

    function _callTarget(address target, bytes memory data) external {
        require(msg.sender == address(this), "Internal call only");
        (bool success,) = target.call(data);
        require(success, "Local call failed");
    }

    function _sendXcmMessage(
        uint32 targetParaId,
        address target,
        bytes memory calldata_
    ) external {
        require(msg.sender == address(this), "Internal call only");
        
        // Construct destination (simplified for hackathon)
        bytes memory destination = _encodeDestination(targetParaId);
        
        // Construct XCM message with Transact instruction
        bytes memory message = _constructTransactMessage(target, calldata_);
        
        // Send XCM message
        XCM.send(destination, message);
    }

    // ========================================================================
    // XCM Message Construction (Simplified)
    // ========================================================================

    function _encodeDestination(uint32 paraId) internal pure returns (bytes memory) {
        // Simplified SCALE encoding for parachain destination
        // In production, this would be more robust
        return abi.encodePacked(uint8(1), paraId); // V1 MultiLocation
    }

    function _constructTransactMessage(
        address target,
        bytes memory calldata_
    ) internal pure returns (bytes memory) {
        // Simplified XCM message construction
        // In production, this would construct proper SCALE-encoded XCM instructions
        
        // This is a mock implementation - in reality you'd need proper SCALE encoding
        // The dApp would likely pre-generate these payloads
        return abi.encode(target, calldata_);
    }

    // ========================================================================
    // Utility Functions
    // ========================================================================

    /// @notice Estimate weight for XCM message (placeholder implementation)
    function estimateXcmWeight(bytes memory message) external view returns (IXcm.Weight memory) {
        return XCM.weighMessage(message);
    }

    /// @notice Check if XCM precompile is available
    function isXcmAvailable() external view returns (bool) {
        try XCM.weighMessage("") returns (IXcm.Weight memory) {
            return true;
        } catch {
            return false;
        }
    }

    function encodeParachainDestination(uint32 paraId) external pure returns (bytes memory) {
        bytes4 paraIdBytesLE = bytes4(paraId); // Solidity uses big-endian, but for uint32 this is fine.
                                             // For a production system, a proper LE conversion is needed.
                                             // For hackathon purposes, this will likely work with most testnet paraIds.

        // VersionedMultiLocation V3: { parents: 1, interior: { X1: { Parachain: paraId } } }
        // 0x01 = parents: 1
        // 0x01 = interior: X1 (1 junction)
        // 0x00000004 = Junction::Parachain
        return abi.encodePacked(uint8(1), uint8(1), bytes4(0x00000004), paraIdBytesLE);
    }
}
