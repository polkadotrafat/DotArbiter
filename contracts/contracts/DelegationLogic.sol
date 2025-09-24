// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Storage.sol";
import "./GovernanceStorage.sol";

contract DelegationLogic is GovernanceStorage {
    using Storage for *;

    /// @notice Delegate voting power to another address
    function delegate(address delegatee) external {
        require(delegatee != address(0), "Invalid delegatee");
        require(delegatee != msg.sender, "Cannot delegate to self");

        address currentDelegate = delegates[msg.sender];

        delegates[msg.sender] = delegatee;

        emit Storage.DelegateChanged(msg.sender, currentDelegate, delegatee);
    }

    /// @notice Remove current delegation
    function undelegate() external {

        address currentDelegate = delegates[msg.sender];
        require(currentDelegate != address(0), "No active delegation");

        delegates[msg.sender] = address(0);

        emit Storage.DelegateChanged(msg.sender, currentDelegate, address(0));
    }

    /// @notice Get current delegate for an address
    function getDelegate(address user) external view returns (address) {

        return delegates[user];
    }

    /// @notice Check if user has delegated their voting power
    function hasDelegated(address user) external view returns (bool) {

        return delegates[user] != address(0);
    }
}
