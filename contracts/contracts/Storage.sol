// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================================
// 1. Storage.sol - Shared Library with Structs, Enums, and Constants
// ============================================================================

library Storage {
    enum ProposalStatus {
        Pending,    // 0 - Just created, voting not started
        Active,     // 1 - Voting period active
        Passed,     // 2 - Voting ended, proposal passed
        Failed,     // 3 - Voting ended, proposal failed
        Executed    // 4 - Proposal has been executed
    }

    struct ProposalAction {
        uint32 targetParaId;    // Target parachain ID (0 for Asset Hub)
        address target;         // Target contract/account
        uint256 value;        // Value to send with the call
        bytes calldata_;        // Encoded function call data
        string description;     // Human-readable description of this action
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        ProposalAction[] actions;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        uint256 quorumRequired;
        uint256 majorityRequired; // Percentage (e.g., 51 for 51%)
        ProposalStatus status;
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteChoice; // true = for, false = against
    }

    struct Vote {
        address voter;
        uint256 proposalId;
        bool support;
        uint256 weight;
        uint256 timestamp;
    }

    // Constants
    uint256 constant VOTING_PERIOD = 1 hours; // Changed to 1 hour for testing
    uint256 constant MIN_QUORUM_PERCENTAGE = 10; // 10% minimum quorum
    uint256 constant DEFAULT_MAJORITY = 51; // 51% majority required
    uint256 constant MAX_ACTIONS_PER_PROPOSAL = 10;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );

    event ProposalStatusChanged(
        uint256 indexed proposalId,
        ProposalStatus indexed newStatus
    );

    event DelegateChanged(
        address indexed delegator,
        address indexed fromDelegate,
        address indexed toDelegate
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        bool success
    );
}
