// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
/*
  _   _ ____  _____ _     ___   ___  ____  
 | | | |  _ \|  ___| |   / _ \ / _ \|  _ \ 
 | | | | |_) | |_  | |  | | | | | | | |_) |
 | |_| |  __/|  _| | |__| |_| | |_| |  _ < 
  \___/|_|   |_|   |_____\___/ \___/|_| \_\

  by DoonLabs
*/


import {IStrategyToken} from "./interfaces/IStrategyToken.sol";
import {AuctionHouse} from "./AuctionHouse.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
    function approve(address to, uint256 tokenId) external;
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

contract UpFloorStrategy is AuctionHouse, Ownable, IERC721Receiver {
    IStrategyToken public immutable token;
    IERC721 public immutable nftCollection;
    
    error NotNFTOwner();
    error InsufficientFunds();
    error InvalidTokenContract();
    error TokenTransferFailed();
    error SelfCall();
    error CallFailed();

    event BidAccepted(uint256 indexed auctionId, uint256 indexed tokenId, address indexed buyer, uint256 price);

    constructor(address _token, address _nftCollection) {
        _initializeOwner(msg.sender);
        token = IStrategyToken(_token);
        nftCollection = IERC721(_nftCollection);
    }

    /// @dev Override owner function from AuctionHouse
    function owner() public view override(AuctionHouse, Ownable) returns (address) {
        return Ownable.owner();
    }




    receive() external payable {} // can receive ETH

    /// @dev Accept a bid using UpFloorToken for a specific NFT at current auction price
    /// @param tokenId The NFT token ID to bid on
    /// @notice Payment is made in UpFloor tokens, tokens are burned upon successful bid
    function acceptBid(uint256 tokenId) external override whenAuctionActive(tokenId) nonReentrant {
        // Use assembly for time calculation and comparison
        uint256 startTime = auctions[tokenId].startTime;
        uint256 timeElapsed;
        
        assembly {
            timeElapsed := sub(timestamp(), startTime)
            
            // Check if auction has expired (maxAuctionDuration = 86400)
            if gt(timeElapsed, 86400) {
                mstore(0x00, 0x8e4f7040) // AuctionExpired()
                revert(0x1c, 0x04)
            }
        }

        // Get current auction price (automatically calculated)
        uint256 currentPrice = currentAuctionPrice(tokenId);
        uint256 minPrice = minSellPrice;
        
        // for price comparison
        assembly {
            if lt(currentPrice, minPrice) {
                mstore(0x00, 0x8f85a043) // PriceBelowMinSell()
                revert(0x1c, 0x04)
            }
        }

        // Check if buyer has enough tokens 
        uint256 buyerBalance = token.balanceOf(msg.sender);
        assembly {
            if lt(buyerBalance, currentPrice) {
                mstore(0x00, 0x356680b7) // InsufficientFunds()
                revert(0x1c, 0x04)
            }
        }

        // SECURITY: Update state BEFORE external calls (CEI pattern)
        uint256 auctionId = auctions[tokenId].auctionId;
        
        // End the auction FIRST
        auctions[tokenId].active = false;
        _removeTokenIdFromActiveList(tokenId);

        //  BURN THE TOKENS by calling _settleAuction
        _settleAuction(tokenId, msg.sender, currentPrice);
        
        emit BidAccepted(auctionId, tokenId, msg.sender, currentPrice);
        emit AuctionSettled(auctionId, tokenId, msg.sender, currentPrice);
    }

    /// @dev Get the address of the UpFloorToken contract
    /// @return tokenAddress The address of the token contract
    function getTokenAddress() external view returns (address tokenAddress) {
        return address(token);
    }

    /// @dev Validate that the token contract is the correct UpFloorToken
    /// @param tokenAddress The address to validate
    /// @return isValid True if the token address matches the expected token
    function validateTokenContract(address tokenAddress) public view returns (bool isValid) {
        return tokenAddress == address(token);
    }

    function _prepareAuction(uint256 tokenId) internal view override {
    }

    function _settleAuction(uint256 tokenId, address buyer, uint256 price) internal override {
        token.lock(price, buyer);
        nftCollection.safeTransferFrom(address(this), buyer, tokenId);
    }

    function _cancelAuction(uint256 tokenId) internal override {
    }

    /// @dev Check if this contract owns a specific NFT
    /// @param tokenId The NFT token ID
    /// @return owned True if this contract owns the NFT
    function _isNFTOwner(uint256 tokenId) internal view override returns (bool owned) {
        try nftCollection.ownerOf(tokenId) returns (address nftOwner) {
            address thisAddr = address(this);
            
            // Assembly comparison
            assembly {
                owned := eq(nftOwner, thisAddr)
            }
        } catch {
            return false;
        }
    }

    function _isCallerNFTOwner(uint256 tokenId) internal view returns (bool owned) {
        try nftCollection.ownerOf(tokenId) returns (address nftOwner) {
            // If the NFT is owned by this contract, allow the contract owner to accept
            if (nftOwner == address(this)) {
                return msg.sender == owner();
            }
            // Otherwise, check if the caller owns the NFT
            return nftOwner == msg.sender;
        } catch {
            return false;
        }
    }

    /// @dev Get the total number of NFTs owned by this contract
    /// @return count The total number of NFTs owned
    function _getNFTBalance() internal view returns (uint256 count) {
        try nftCollection.balanceOf(address(this)) returns (uint256 balance) {
            return balance;
        } catch {
            return 0;
        }
    }

    /// @dev Check if user has enough tokens
    /// @param user The user address
    /// @param amount The token amount
    /// @return hasEnough True if user has enough tokens
    function _hasEnoughTokens(address user, uint256 amount) internal view override returns (bool hasEnough) {
        uint256 bal = token.balanceOf(user);
        
        // Assembly comparison
        assembly {
            hasEnough := iszero(lt(bal, amount))
        }
    }


    /// @dev Transfer tokens from user to this contract
    /// @param user The user address
    /// @param amount The token amount
    function _transferTokensFromUser(address user, uint256 amount) internal override {
        bool success = token.transferFrom(user, address(this), amount);
        if (!success) revert TokenTransferFailed();
    }

    /// @dev Transfer NFT to user
    /// @param tokenId The NFT token ID
    /// @param user The user address
    function _transferNFTToUser(uint256 tokenId, address user) internal override {
        nftCollection.safeTransferFrom(address(this), user, tokenId);
    }

    /// @dev Handle the receipt of an NFT
    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}