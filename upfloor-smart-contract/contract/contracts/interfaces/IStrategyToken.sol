// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IStrategyToken {
    // === SURPLUS MANAGEMENT ===
    function surplus() external view returns (uint256);
    function useSurplus(uint256 amount) external;

    // === TOKEN SUPPLY STATE ===
    function totalSupply() external view returns (uint256);
    function effectiveSupply() external view returns (uint256);
    function lockedSupply() external view returns (uint256);

    // === TOKEN LOCKING ===
    function lock(uint256 amount, address from) external;

    // === ERC20 FUNCTIONS ===
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}