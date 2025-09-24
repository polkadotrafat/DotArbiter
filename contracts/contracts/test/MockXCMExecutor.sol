// contracts/test/MockXcmExecutor.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Storage.sol";
import "../GovernanceStorage.sol";

// This mock inherits from GovernanceStorage so it can access the proposals mapping
contract MockXcmExecutor is GovernanceStorage {
    event XcmActionExecuted(
        uint256 proposalId,
        bytes destination,
        bytes message
    );
    event LocalActionExecuted(
        uint256 proposalId,
        address target,
        uint256 value,
        bytes calldata_
    );

    function executeProposal(uint256 proposalId) external payable {
        Storage.Proposal storage p = proposals[proposalId];
        require(p.status == Storage.ProposalStatus.Passed, "Proposal not passed");
        p.status = Storage.ProposalStatus.Executed;

        for (uint256 i = 0; i < p.actions.length; i++) {
            Storage.ProposalAction memory action = p.actions[i];
            if (action.targetParaId == 0) {
                emit LocalActionExecuted(proposalId, action.target, action.value, action.calldata_);
            } else {
                (bytes memory destination, bytes memory message) = abi.decode(action.calldata_, (bytes, bytes));
                emit XcmActionExecuted(proposalId, destination, message);
            }
        }
    }
}