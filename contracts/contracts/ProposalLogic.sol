// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GovernanceStorage.sol";
import "./Storage.sol";

contract ProposalLogic  is GovernanceStorage {

    // ========================================================================
    // Proposal Creation
    // ========================================================================

    /// @notice Create a new cross-chain proposal
    function createProposal(
        string calldata description,
        Storage.ProposalAction[] calldata actions
    ) external returns (uint256) {
        require(bytes(description).length > 0, "Description required");
        require(actions.length > 0 && actions.length <= Storage.MAX_ACTIONS_PER_PROPOSAL, "Invalid actions count");

        // CORRECTED: Directly access state variables inherited from GovernanceStorage
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Storage.Proposal storage p = proposals[proposalId];
        p.id = proposalId;
        p.proposer = msg.sender;
        p.description = description;
        p.startTime = block.timestamp;
        p.endTime = block.timestamp + Storage.VOTING_PERIOD;
        p.status = Storage.ProposalStatus.Active;

        for (uint256 i = 0; i < actions.length; i++) {
            p.actions.push(actions[i]);
        }

        emit Storage.ProposalCreated(proposalId, msg.sender, description, p.startTime, p.endTime);
        return proposalId;
    }

    // ========================================================================
    // Voting Logic
    // ========================================================================

    /// @notice Cast a vote on a proposal
    function vote(uint256 proposalId, bool support, uint256 votingWeight) external {
        Storage.Proposal storage p = proposals[proposalId];
        
        require(p.id != 0, "Proposal does not exist");
        require(p.status == Storage.ProposalStatus.Active, "Proposal not active");
        require(block.timestamp <= p.endTime, "Voting period ended");
        require(votingWeight > 0, "No voting power");

        // --- NEW AND CRITICAL FIX ---
        // Rule 1: A user who has already delegated their power cannot vote directly.
        require(delegates[msg.sender] == address(0), "User has delegated their vote");
        // --- END OF FIX ---

        // The logic for the effectiveVoter is now simpler, because we know
        // the msg.sender is the one voting.
        address voter = msg.sender;
        require(!p.hasVoted[voter], "Already voted");

        p.hasVoted[voter] = true;
        p.voteChoice[voter] = support;

        if (support) {
            p.forVotes += votingWeight;
        } else {
            p.againstVotes += votingWeight;
        }

        emit Storage.VoteCast(proposalId, voter, support, votingWeight);
    }

    /// @notice Allows a delegate to vote on behalf of their delegators.
    /// @param delegators An array of addresses that have delegated to the msg.sender.
    function voteByProxy(
        uint256 proposalId,
        bool support,
        address[] calldata delegators,
        uint256[] calldata votingWeights
    ) external {
        Storage.Proposal storage p = proposals[proposalId];
        
        require(p.id != 0, "Proposal does not exist");
        require(p.status == Storage.ProposalStatus.Active, "Proposal not active");
        require(block.timestamp <= p.endTime, "Voting period ended");
        require(delegators.length == votingWeights.length, "Array length mismatch");

        address delegatee = msg.sender;
        require(!p.hasVoted[delegatee], "Delegate has already voted for themself");

        uint256 totalDelegatedWeight = 0;

        for(uint i = 0; i < delegators.length; i++) {
            address delegator = delegators[i];
            // Verify that this user has indeed delegated to the caller
            require(delegates[delegator] == delegatee, "Not a valid delegator");
            // Verify this delegator's vote hasn't already been cast
            require(!p.hasVoted[delegator], "Delegator vote already cast");

            p.hasVoted[delegator] = true; // Mark the delegator as having voted (via proxy)
            p.voteChoice[delegator] = support; // Record their choice
            totalDelegatedWeight += votingWeights[i];
        }

        // Add the total delegated weight to the tally
        if (support) {
            p.forVotes += totalDelegatedWeight;
        } else {
            p.againstVotes += totalDelegatedWeight;
        }

        // The delegate's address is the one who cast the vote
        emit Storage.VoteCast(proposalId, delegatee, support, totalDelegatedWeight);
    }

    /// @notice Tally votes and update proposal status
    function tallyProposal(uint256 proposalId) external {
        Storage.Proposal storage p = proposals[proposalId];
        
        require(p.id != 0, "Proposal does not exist");
        require(p.status == Storage.ProposalStatus.Active, "Proposal not active");
        require(block.timestamp > p.endTime, "Voting still active");

        uint256 totalVotes = p.forVotes + p.againstVotes;
        
        // Simplified quorum check for testing: require at least 2 votes for quorum
        bool quorumReached = totalVotes >= 2; 
        
        bool majorityReached = false;
        if (totalVotes > 0) {
            // Using 51 as a constant for 51% majority
            majorityReached = (p.forVotes * 100) / totalVotes >= 51;
        }

        if (quorumReached && majorityReached) {
            p.status = Storage.ProposalStatus.Passed;
        } else {
            p.status = Storage.ProposalStatus.Failed;
        }

        emit Storage.ProposalStatusChanged(proposalId, p.status);
    }

    // ========================================================================
    // View Functions
    // ========================================================================

    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 startTime,
        uint256 endTime,
        Storage.ProposalStatus status
    ) {
        Storage.Proposal storage proposal = proposals[proposalId];
        
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.startTime,
            proposal.endTime,
            proposal.status
        );
    }
}
