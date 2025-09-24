// contracts/test/MockReceiver.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockReceiver {
    event Received(address sender, uint256 value, string message);

    fallback() external payable {
        emit Received(msg.sender, msg.value, "fallback");
    }

    receive() external payable {
        emit Received(msg.sender, msg.value, "receive");
    }
}