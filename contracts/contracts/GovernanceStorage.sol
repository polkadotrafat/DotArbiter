// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Storage.sol";

// ============================================================================
// NEW: GovernanceStorage.sol - The base contract holding all state.
// Both the Hub and Logic contracts will inherit from this.
// ============================================================================

abstract contract GovernanceStorage {
    // State variables are declared here for a consistent storage layout.
    address public owner;
    uint256 public proposalCount;
    
    mapping(uint256 => Storage.Proposal) public proposals;
    mapping(address => address) public delegates;
    
    // A mapping from a function selector to its implementation contract
    mapping(bytes4 => address) public functionImplementations;
}