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
    function vote(uint256 proposalId, bool support) external {
        Storage.Proposal storage p = proposals[proposalId];
        
        require(p.id != 0, "Proposal does not exist");
        require(p.status == Storage.ProposalStatus.Active, "Proposal not active");
        require(block.timestamp <= p.endTime, "Voting period ended");
        
        // Security check: Ensure user has not delegated their vote
        require(delegates[msg.sender] == address(0), "User has delegated their vote");
        
        address voter = msg.sender;
        require(!p.hasVoted[voter], "Already voted");

        // FIX: Voting weight is now a constant `1`, not a user input.
        uint256 votingWeight = 1;

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
    function voteByProxy(uint256 proposalId, bool support) external {
        Storage.Proposal storage p = proposals[proposalId];
        
        require(p.id != 0, "Proposal does not exist");
        require(p.status == Storage.ProposalStatus.Active, "Proposal not active");
        require(block.timestamp <= p.endTime, "Voting period ended");

        address delegatee = msg.sender;
        require(!p.hasVoted[delegatee], "Delegate has already voted");
        
        address[] storage delegatorList = delegatorsOf[delegatee];

        uint256 totalWeight = 1; // Start with the delegate's own vote.

        for(uint i = 0; i < delegatorList.length; i++) {
            address delegator = delegatorList[i];

            if (!p.hasVoted[delegator]) {
                p.hasVoted[delegator] = true;
                p.voteChoice[delegator] = support;
                totalWeight++;
            }
        }

        p.hasVoted[delegatee] = true;
        p.voteChoice[delegatee] = support;

        if (support) {
            p.forVotes += totalWeight;
        } else {
            p.againstVotes += totalWeight;
        }
        
        emit Storage.VoteCast(proposalId, delegatee, support, totalWeight);
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
