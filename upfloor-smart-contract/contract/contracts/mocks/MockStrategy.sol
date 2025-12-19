// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockStrategy {
    receive() external payable {}
    
    // This contract just needs to receive ETH for testing
    // The actual strategy functionality is tested in LemonFunStrategy tests
}
