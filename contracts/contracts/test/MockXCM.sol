// contracts/test/MockXcm.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IXcm.sol";

contract MockXcm is IXcm {
    event MessageSent(bytes destination, bytes message);
    event MessageExecuted(bytes message, Weight weight);

    function send(bytes calldata destination, bytes calldata message) external override {
        emit MessageSent(destination, message);
    }

    function execute(bytes calldata message, Weight calldata weight) external override {
        emit MessageExecuted(message, weight);
    }

    function weighMessage(bytes calldata /* message */)
        external
        pure
        override
        returns (Weight memory weight)
    {
        return Weight({refTime: 1_000_000_000, proofSize: 10_000});
    }
}