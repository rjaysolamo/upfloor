// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMintableToken {
    function previewMint(uint256 amount) external view returns (uint256);
    function mint(uint256 amount, address receiver) external payable;
}

contract MintRouter is ReentrancyGuard {
    IMintableToken public immutable token;
    
    error InsufficientETH();

    constructor(address _token) {
        token = IMintableToken(_token);
    }

    // @dev Mint tokens and refund the remaining ETH (so we can handle slippage)
    function mint(uint256 amount, address receiver) external payable nonReentrant {
        uint256 price = token.previewMint(amount);
        if (msg.value < price) revert InsufficientETH();
        
        // Calculate refund amount before external call
        uint256 refundAmount;
        unchecked {
            refundAmount = msg.value - price;
        }
        
        // Make external call to token contract
        token.mint{value: price}(amount, receiver);
        
        // Refund the remaining ETH after external call
        if (refundAmount > 0) {
            SafeTransferLib.safeTransferETH(msg.sender, refundAmount);
        }
    }
}