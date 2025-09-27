// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GovernanceStorage.sol";

// ============================================================================
// GovernanceHub.sol - The Core Proxy and State Contract
// ============================================================================
// @title DotArbiter Governance Hub
// @author Your Name / Team Name
// @notice This is the main entry point for the DotArbiter DAO. It holds all
// state and delegates logic execution to separate implementation contracts.
// This modular design (a "Diamond-like" or proxy pattern) helps overcome
// contract size limits and allows for future upgrades.
// ============================================================================

contract GovernanceHub is GovernanceStorage {

    // ========================================================================
    // Constructor and Administration
    // ========================================================================

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /// @notice Sets or updates the implementation contract for a given set of function selectors.
    /// @dev This is the core administrative function for setting up the proxy routing.
    /// @param selectors An array of 4-byte function selectors.
    /// @param implementations An array of implementation contract addresses. Must be the same length as selectors.
    function setImplementations(
        bytes4[] calldata selectors,
        address[] calldata implementations
    ) external onlyOwner {
        require(selectors.length == implementations.length, "Input array length mismatch");
        for (uint256 i = 0; i < selectors.length; i++) {
            functionImplementations[selectors[i]] = implementations[i];
        }
    }

    /// @notice Transfers ownership of the protocol to a new address.
    /// @param newOwner The address of the new owner.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }

    // ========================================================================
    // Core Proxy Logic
    // ========================================================================

    /// @notice The fallback function is the heart of the proxy. It catches all
    /// calls to the hub that don't match other function signatures.
    fallback() external payable {
        address implementation = functionImplementations[msg.sig];
        _delegate(implementation);
    }

    /// @notice The receive function handles PLAIN ETHER transfers to the hub.
    /// @dev It should be simple and just accept the funds. It does not need to delegate.
    receive() external payable {
        // This function is now empty. Its only purpose is to allow the contract
        // to receive Ether directly. No delegation is needed for a simple transfer.
    }
    /// @dev Internal helper function to perform the low-level delegatecall.
    /// @param implementation The address of the contract whose code will be executed.
    function _delegate(address implementation) internal {
        // This require check is the reason for the "Implementation not set" error.
        // It ensures we don't try to delegatecall to the zero address.
        require(implementation != address(0), "Implementation not set");

        assembly {
            // Copy the incoming call data to memory
            calldatacopy(0, 0, calldatasize())

            // Perform the delegatecall, forwarding all gas.
            // The 'result' will be 0 on failure, 1 on success.
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)

            // Copy the return data from the implementation call back to the caller
            returndatacopy(0, 0, returndatasize())

            // Check the result of the delegatecall and either return or revert.
            // This effectively "bubbles up" any success or failure from the logic contract.
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    // ========================================================================
    // NEW: Dedicated Getter Function for Mapping Data
    // ========================================================================

    /// @notice Checks if a specific address has already voted on a proposal.
    /// @param proposalId The ID of the proposal to check.
    /// @param voter The address of the voter to check.
    /// @return A boolean indicating if the voter has cast their vote.
    function hasVoterVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }
}