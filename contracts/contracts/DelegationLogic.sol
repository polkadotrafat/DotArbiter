// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Storage.sol";
import "./GovernanceStorage.sol";

contract DelegationLogic is GovernanceStorage {
    using Storage for *;

    /// @notice Delegate voting power to another address
    /// @notice Delegate voting power to another address.
    function delegate(address delegatee) external {
        address delegator = msg.sender;
        require(delegatee != address(0), "Invalid delegatee");
        require(delegatee != delegator, "Cannot delegate to self");

        // If user is already delegating, first remove them from the old list.
        address currentDelegate = delegates[delegator];
        if (currentDelegate != address(0)) {
            _removeDelegator(currentDelegate, delegator);
        }

        delegates[delegator] = delegatee;
        _addDelegator(delegatee, delegator);

        emit Storage.DelegateChanged(delegator, currentDelegate, delegatee);
    }

    /// @notice Remove current delegation
    function undelegate() external {
        address delegator = msg.sender;
        address currentDelegate = delegates[delegator];
        require(currentDelegate != address(0), "No active delegation");

        _removeDelegator(currentDelegate, delegator);
        delegates[delegator] = address(0);

        emit Storage.DelegateChanged(delegator, currentDelegate, address(0));
    }

    /// @dev Adds a delegator to a delegatee's list. O(1)
    function _addDelegator(address delegatee, address delegator) private {
        // Store the delegator's new index (which is the current length of the array)
        // and push them to the end of the array.
        _delegatorIndex[delegator] = delegatorsOf[delegatee].length;
        delegatorsOf[delegatee].push(delegator);
    }

    /// @dev Removes a delegator using the "swap-and-pop" method. O(1)
    function _removeDelegator(address delegatee, address delegator) private {
        // 1. Get the index of the delegator we want to remove.
        uint256 indexToRemove = _delegatorIndex[delegator];
        
        // 2. Get the address of the *last* delegator in the array.
        address lastDelegator = delegatorsOf[delegatee][delegatorsOf[delegatee].length - 1];

        // 3. Move the last delegator into the slot of the one we are removing.
        delegatorsOf[delegatee][indexToRemove] = lastDelegator;

        // 4. Update the index of the moved delegator.
        _delegatorIndex[lastDelegator] = indexToRemove;

        // 5. Remove the (now duplicated) last element.
        delegatorsOf[delegatee].pop();

        // 6. Clear the index of the removed delegator.
        delete _delegatorIndex[delegator];
    }

    /// @notice Returns the number of accounts delegating to a user.
    function getDelegatorCount(address delegatee) external view returns (uint256) {
        return delegatorsOf[delegatee].length;
    }

    /// @notice Returns the delegator at a specific index for a delegatee.
    function getDelegatorAtIndex(address delegatee, uint256 index) external view returns (address) {
        return delegatorsOf[delegatee][index];
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
