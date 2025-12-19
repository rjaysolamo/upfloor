// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {UpFloorToken} from "./UpFloorToken.sol";
import {MintRouter} from "./interfaces/IMintableToken.sol";
import {UpFloorStrategy} from "./UpFloorStrategy.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";


// UpFloor Strategy Factory
/*
  _   _ ____  _____ _     ___   ___  ____  
 | | | |  _ \|  ___| |   / _ \ / _ \|  _ \ 
 | | | | |_) | |_  | |  | | | | | | | |_) |
 | |_| |  __/|  _| | |__| |_| | |_| |  _ < 
  \___/|_|   |_|   |_____\___/ \___/|_| \_\

  by DoonLabs
*/


contract UpFloorStrategyFactory is Ownable {
    mapping(address => address[]) public userTokens;
    mapping(address => bool) public deployedTokens;
    mapping(address => address) public tokenToStrategy;
    address public constant PROTOCOL_FEE_RECIPIENT = 0x0Dac4637A9b04F64c6b92a19866cd0764adfB6a8;
    
    // Deployment fee constants for different chains (packed for gas efficiency)
    uint256 public constant APE_DEPLOYMENT_FEE = 2500 * 1e18; 
    uint256 public constant ETH_DEPLOYMENT_FEE = 0.026 * 1e18; 
    uint256 public constant HYPE_DEPLOYMENT_FEE = 2.31 * 1e18;
    
    uint256 public deploymentFee;
    
    error InvalidInput();
    error InsufficientDeploymentFee();
    error InvalidDeploymentFee();
    
    event TokenDeployed(address indexed deployer, address indexed token, address router, address strategy, string name, string symbol, uint256 deploymentFee);
    event DeploymentFeeUpdated(uint256 oldFee, uint256 newFee);
    
    constructor() { 
        _initializeOwner(msg.sender);
        
        // Set deployment fee based on chain ID
        uint256 chainId = block.chainid;
        if (chainId == 33139) {
            deploymentFee = APE_DEPLOYMENT_FEE;
        } else if (chainId == 1) {
            deploymentFee = ETH_DEPLOYMENT_FEE;
        } else if (chainId == 999) {
            deploymentFee = HYPE_DEPLOYMENT_FEE;
        } else {
            deploymentFee = ETH_DEPLOYMENT_FEE; // Default
        }
    }

    function deployStrategyToken(
        string memory _name,
        string memory _symbol,
        address _nftCollection,
        address _collectionOwnerAddress,
        address _royaltyRecipient,
        uint256 _royaltyBps
    ) external payable returns (address token, address router, address strategy) {
        // Validate inputs
        if (bytes(_name).length == 0 || bytes(_symbol).length == 0 || 
            _nftCollection == address(0) || _collectionOwnerAddress == address(0) || 
            _royaltyRecipient == address(0)) revert InvalidInput();
        
        if (msg.value < deploymentFee) revert InsufficientDeploymentFee();
        
        // Deploy contracts
        UpFloorToken newToken = new UpFloorToken(_name, _symbol, PROTOCOL_FEE_RECIPIENT, _nftCollection, _collectionOwnerAddress, _royaltyRecipient, _royaltyBps);
        token = address(newToken);
        
        MintRouter newRouter = new MintRouter(token);
        router = address(newRouter);
        
        UpFloorStrategy newStrategy = new UpFloorStrategy(token, _nftCollection);
        strategy = address(newStrategy);
        
        // Setup ownership and strategy
        newToken.setStrategy(strategy);
        newToken.transferOwnership(msg.sender);
        newStrategy.transferOwnership(msg.sender);
        
        // Update mappings
        userTokens[msg.sender].push(token);
        deployedTokens[token] = true;
        tokenToStrategy[token] = strategy;

        // Transfer deployment fee
        if (msg.value > 0) {
            (bool success,) = PROTOCOL_FEE_RECIPIENT.call{value: msg.value}("");
            if (!success) revert("Transfer failed");
        }
        
        emit TokenDeployed(msg.sender, token, router, strategy, _name, _symbol, msg.value);
    }


    function getUserTokens(address user) external view returns (address[] memory) { return userTokens[user]; }
    function isDeployedToken(address token) external view returns (bool) { return deployedTokens[token]; }
    function getTokenStrategy(address token) external view returns (address) { return tokenToStrategy[token]; }
    function getDeploymentFee() external view returns (uint256) { return deploymentFee; }
    
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        if (newFee == 0) revert InvalidDeploymentFee();
        
        uint256 oldFee = deploymentFee;
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(oldFee, newFee);
    }
}