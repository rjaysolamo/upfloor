// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FixedPointMathLib} from "solady/src/utils/FixedPointMathLib.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

abstract contract AuctionHouse is ReentrancyGuard {
    uint256 public auctionDecayRate = 1e14; // Auction decay rate
    uint256 public auctionStartPrice = 1 * 1e18; // placeholder for testing
    uint256 public minSellPrice = 0.1 * 1e18; // testing (but this can be set by the owner)
    uint256 public constant maxAuctionDuration = 24 hours; // 24 hours(which is the default duration)

    error AuctionNotActive();
    error AuctionAlreadyActive();
    error PriceTooHigh();
    error InvalidPrice();
    error NotOwner();
    error AuctionExpired();
    error PriceBelowMinSell();
    error NFTNotOwned();
    error InsufficientTokenBalance();
    error PendingApproval();
    error ProposalNotFound();
    error ProposalAlreadyExists();
    error InvalidProposalStatus();
    error InvalidAuctionParams();

    event AuctionStarted(uint256 indexed auctionId, uint256 indexed tokenId, uint256 startPrice, uint256 endPrice);
    event AuctionSettled(
        uint256 indexed auctionId, uint256 indexed tokenId, address indexed buyer, uint256 price
    );
    event AuctionCancelled(uint256 indexed auctionId, uint256 indexed tokenId);
    event MinSellPriceUpdated(uint256 indexed newMinSellPrice);
    event AuctionProposed(uint256 indexed proposalId, uint256 indexed tokenId, address indexed proposer, uint256 startPrice, uint256 endPrice);
    event AuctionProposalApproved(uint256 indexed proposalId, uint256 indexed tokenId, uint256 indexed auctionId);
    event AuctionProposalRejected(uint256 indexed proposalId, uint256 indexed tokenId);

    /// @dev Abstract function to get the owner address - must be implemented by inheriting contracts
    function owner() public view virtual returns (address);

    // Mapping from tokenId to auction data
    mapping(uint256 => Auction) public auctions;
    
    // Array of all tokenIds that have auctions
    uint256[] public activeTokenIds;
    
    // Mapping to check if tokenId has an active auction
    mapping(uint256 => bool) public hasActiveAuction;

    // Proposal system
    mapping(uint256 => AuctionProposal) public proposals;
    mapping(uint256 => uint256) public tokenIdToProposalId; // Track if tokenId has a pending proposal
    uint256 public _nextProposalId;
    uint256[] public pendingProposalIds;

    uint256 public _nextAuctionId;

    struct Auction {
        bool active;
        uint256 auctionId;
        uint256 tokenId;
        uint256 startTime;
        uint256 currentPrice;
        uint256 startPrice;
        uint256 endPrice;
    }

    enum ProposalStatus {
        None,
        Pending,
        Approved,
        Rejected
    }

    struct AuctionProposal {
        uint256 proposalId;
        uint256 tokenId;
        address proposer;
        uint256 startPrice;
        uint256 endPrice;
        uint256 proposedAt;
        ProposalStatus status;
    }

    modifier whenAuctionActive(uint256 tokenId) {
        if (!auctions[tokenId].active) revert AuctionNotActive();
        _;
    }

    modifier whenAuctionNotActive(uint256 tokenId) {
        if (auctions[tokenId].active) revert AuctionAlreadyActive();
        _;
    }

    modifier onlyNFTOwner(uint256 tokenId) {
        if (!_isNFTOwner(tokenId)) revert NFTNotOwned();
        _;
    }



    /// @dev Start a Dutch auction for a specific NFT
    /// @param tokenId The NFT token ID
    /// @param startPrice The starting price in tokens (maximum price)
    /// @param endPrice The ending price in tokens (minimum price)
    /// @return auctionId The auction ID
    function startAuction(uint256 tokenId, uint256 startPrice, uint256 endPrice)
        external
        whenAuctionNotActive(tokenId)
        onlyNFTOwner(tokenId)
        returns (uint256 auctionId)
    {
        return _startAuctionInternal(tokenId, startPrice, endPrice);
    }

    /// @dev Internal function to start auction (used by both direct start and approval)
    function _startAuctionInternal(uint256 tokenId, uint256 startPrice, uint256 endPrice) internal returns (uint256 auctionId) {
        uint256 minPrice = minSellPrice;
        
        // Assembly validation for gas efficiency
        assembly {
            // Check if any price is zero or invalid comparisons
            if or(
                or(iszero(startPrice), iszero(endPrice)),
                or(lt(startPrice, endPrice), lt(endPrice, minPrice))
            ) {
                mstore(0x00, 0x0f2ee695) // InvalidAuctionParams()
                revert(0x1c, 0x04)
            }
        }
        
        _prepareAuction(tokenId);

        // Assembly for ID increment
        assembly {
            auctionId := sload(_nextAuctionId.slot)
            sstore(_nextAuctionId.slot, add(auctionId, 1))
        }
        
        uint256 startTime = block.timestamp;
        
        // Optimized storage write - remove redundant currentPrice
        auctions[tokenId] = Auction({
            active: true,
            auctionId: auctionId,
            tokenId: tokenId,
            startTime: startTime,
            currentPrice: 0, // Not used, always calculated dynamically
            startPrice: startPrice,
            endPrice: endPrice
        });
        
        hasActiveAuction[tokenId] = true;
        activeTokenIds.push(tokenId);
        
        emit AuctionStarted(auctionId, tokenId, startPrice, endPrice);
    }

    /// @dev Accept a bid for an NFT using tokens at current auction price
    /// @param tokenId The NFT token ID
    function acceptBid(uint256 tokenId) external virtual whenAuctionActive(tokenId) nonReentrant {
        Auction storage auctionData = auctions[tokenId];
        
        //  for time calculation
        uint256 timeElapsed;
        uint256 startTime = auctionData.startTime;
        
        assembly {
            timeElapsed := sub(timestamp(), startTime)
            
            // Check if auction expired (maxAuctionDuration = 86400)
            if gt(timeElapsed, 86400) {
                mstore(0x00, 0x8e4f7040) // AuctionExpired()
                revert(0x1c, 0x04)
            }
        }

        // Calculate price directly (avoid function call overhead)
        uint256 currentPrice = _priceAt(timeElapsed, auctionData.startPrice, auctionData.endPrice);
        uint256 minPrice = minSellPrice;
        
        // for price check
        assembly {
            if lt(currentPrice, minPrice) {
                currentPrice := minPrice
            }
        }
        
        // Check if user has enough tokens
        if (!_hasEnoughTokens(msg.sender, currentPrice)) revert InsufficientTokenBalance();

        // Update state in one go
        auctionData.active = false;
        _removeTokenIdFromActiveList(tokenId);
        
        _settleAuction(tokenId, msg.sender, currentPrice);
        emit AuctionSettled(auctionData.auctionId, tokenId, msg.sender, currentPrice);
    }

    /// @dev Cancel an active auction listing
    /// @param tokenId The NFT token ID
    function cancelAuctionListing(uint256 tokenId) external {
        if (msg.sender != owner()) revert NotOwner();
        
        Auction storage auctionData = auctions[tokenId];
        if (!auctionData.active) revert AuctionNotActive();
        
        // Update state in one go
        auctionData.active = false;
        _removeTokenIdFromActiveList(tokenId);
        
        _cancelAuction(tokenId);
        emit AuctionCancelled(auctionData.auctionId, tokenId);
    }

    /// @dev Get current auction price for a specific tokenId
    /// @param tokenId The NFT token ID
    /// @return price The current auction price in tokens
    function currentAuctionPrice(uint256 tokenId) public view returns (uint256 price) {
        Auction memory auctionData = auctions[tokenId];
        
        // Assembly for active check
        assembly {
            if iszero(mload(auctionData)) { // Check active flag (first member)
                return(0, 32)
            }
        }
        
        uint256 timeElapsed;
        uint256 startTime = auctionData.startTime;
        
        assembly {
            timeElapsed := sub(timestamp(), startTime)
        }
        
        uint256 calculatedPrice = _priceAt(timeElapsed, auctionData.startPrice, auctionData.endPrice);
        uint256 minPrice = minSellPrice;
        
     
        assembly {
            price := calculatedPrice
            if lt(calculatedPrice, minPrice) {
                price := minPrice
            }
        }
    }


    /// @dev Get all active token IDs
    /// @return tokenIds Array of active token IDs
    function getActiveTokenIds() external view returns (uint256[] memory tokenIds) {
        return activeTokenIds;
    }

    /// @dev Get the number of active auctions
    /// @return count The number of active auctions
    function getActiveAuctionCount() external view returns (uint256 count) {
        return activeTokenIds.length;
    }

    /// @dev Set the minimum sell price for auctions
    /// @param newMinSellPrice The new minimum sell price
    function setMinSellPrice(uint256 newMinSellPrice) external {
        address ownerAddr = owner();
        
        // Assembly validation
        assembly {
            if or(iszero(eq(caller(), ownerAddr)), iszero(newMinSellPrice)) {
                mstore(0x00, 0xf6b5964b) // InvalidPrice()
                revert(0x1c, 0x04)
            }
        }
        
        minSellPrice = newMinSellPrice;
        emit MinSellPriceUpdated(newMinSellPrice);
    }

    // ==================== PROPOSAL SYSTEM ====================

    /// @dev Propose an auction for an NFT owned by the strategy contract
    /// @param tokenId The NFT token ID
    /// @param startPrice The starting price in tokens (maximum price)
    /// @param endPrice The ending price in tokens (minimum price)
    /// @return proposalId The proposal ID
    function proposeAuction(uint256 tokenId, uint256 startPrice, uint256 endPrice) 
        external 
        returns (uint256 proposalId) 
    {
        // Validate the NFT is owned by the strategy contract
        if (!_isNFTOwner(tokenId)) revert NFTNotOwned();
        
        // Check if there's already an active auction for this token
        if (auctions[tokenId].active) revert AuctionAlreadyActive();
        
        // Check if there's already a pending proposal for this token
        uint256 existingProposalId = tokenIdToProposalId[tokenId];
        if (existingProposalId != 0 && proposals[existingProposalId].status == ProposalStatus.Pending) {
            revert ProposalAlreadyExists();
        }
        
        // Validate auction parameters using assembly
        uint256 minPrice = minSellPrice;
        assembly {
            if or(
                or(iszero(startPrice), iszero(endPrice)),
                or(lt(startPrice, endPrice), lt(endPrice, minPrice))
            ) {
                mstore(0x00, 0x0f2ee695) // InvalidAuctionParams()
                revert(0x1c, 0x04)
            }
        }

        // Assembly for ID increment
        assembly {
            proposalId := sload(_nextProposalId.slot)
            proposalId := add(proposalId, 1)
            sstore(_nextProposalId.slot, proposalId)
        }
        
        proposals[proposalId] = AuctionProposal({
            proposalId: proposalId,
            tokenId: tokenId,
            proposer: msg.sender,
            startPrice: startPrice,
            endPrice: endPrice,
            proposedAt: block.timestamp,
            status: ProposalStatus.Pending
        });
        
        tokenIdToProposalId[tokenId] = proposalId;
        pendingProposalIds.push(proposalId);
        
        emit AuctionProposed(proposalId, tokenId, msg.sender, startPrice, endPrice);
    }

    /// @dev Approve a pending auction proposal and start the auction
    /// @param proposalId The proposal ID to approve
    /// @return auctionId The auction ID that was created
    function approveAuctionProposal(uint256 proposalId) 
        external 
        returns (uint256 auctionId) 
    {
        if (msg.sender != owner()) revert NotOwner();
        
        AuctionProposal storage proposal = proposals[proposalId];
        
        // Validate proposal exists and is pending
        if (proposal.status != ProposalStatus.Pending) revert InvalidProposalStatus();
        
        uint256 tokenId = proposal.tokenId;
        
        // Verify NFT is still owned by strategy and no active auction
        if (!_isNFTOwner(tokenId)) revert NFTNotOwned();
        if (auctions[tokenId].active) revert AuctionAlreadyActive();
        
        // Update proposal status
        proposal.status = ProposalStatus.Approved;
        
        // Remove from pending list
        _removeProposalFromPendingList(proposalId);
        
        // Start the auction using the internal function
        auctionId = _startAuctionInternal(tokenId, proposal.startPrice, proposal.endPrice);
        
        emit AuctionProposalApproved(proposalId, tokenId, auctionId);
    }

    /// @dev Reject a pending auction proposal
    /// @param proposalId The proposal ID to reject
    function rejectAuctionProposal(uint256 proposalId) external {
        if (msg.sender != owner()) revert NotOwner();
        
        AuctionProposal storage proposal = proposals[proposalId];
        
        // Validate proposal exists and is pending
        if (proposal.status != ProposalStatus.Pending) revert InvalidProposalStatus();
        
        uint256 tokenId = proposal.tokenId;
        
        // Update proposal status
        proposal.status = ProposalStatus.Rejected;
        
        // Remove from pending list
        _removeProposalFromPendingList(proposalId);
        
        // Clear the tokenId mapping
        delete tokenIdToProposalId[tokenId];
        
        emit AuctionProposalRejected(proposalId, tokenId);
    }

    /// @dev Get all pending proposal IDs
    /// @return proposalIds Array of pending proposal IDs
    function getPendingProposalIds() external view returns (uint256[] memory proposalIds) {
        return pendingProposalIds;
    }

    /// @dev Get the number of pending proposals
    /// @return count The number of pending proposals
    function getPendingProposalCount() external view returns (uint256 count) {
        return pendingProposalIds.length;
    }

    /// @dev Get proposal details by ID
    /// @param proposalId The proposal ID
    /// @return proposal The proposal details
    function getProposal(uint256 proposalId) external view returns (AuctionProposal memory proposal) {
        return proposals[proposalId];
    }

    /// @dev Check if a token has a pending proposal
    /// @param tokenId The NFT token ID
    /// @return hasPending True if there's a pending proposal for this token
    function hasPendingProposal(uint256 tokenId) external view returns (bool hasPending) {
        uint256 proposalId = tokenIdToProposalId[tokenId];
        if (proposalId == 0) return false;
        return proposals[proposalId].status == ProposalStatus.Pending;
    }

    /// @dev Helper function to remove proposal from pending list
    /// @param proposalId The proposal ID to remove
    function _removeProposalFromPendingList(uint256 proposalId) internal {
        uint256 length = pendingProposalIds.length;
        if (length == 0) return;
        
        // Optimized: check last element first (common case)
        if (pendingProposalIds[length - 1] == proposalId) {
            pendingProposalIds.pop();
            return;
        }
        
        // Search from beginning if not last element
        for (uint256 i = 0; i < length - 1;) {
            if (pendingProposalIds[i] == proposalId) {
                // Move the last element to the position of the element to delete
                pendingProposalIds[i] = pendingProposalIds[length - 1];
                pendingProposalIds.pop();
                return;
            }
            unchecked {
                ++i;
            }
        }
    }

    function _priceAt(uint256 t, uint256 startPrice, uint256 endPrice) internal view returns (uint256 price) {
        int256 exp = -int256(auctionDecayRate) * int256(t);
        uint256 ratio = uint256(FixedPointMathLib.expWad(exp));

        // If ratio is 0 or very small, return end price
        if (ratio == 0) return endPrice;

        // Calculate price between startPrice and endPrice
        uint256 priceRange = startPrice - endPrice;
        price = endPrice + FixedPointMathLib.mulWadUp(priceRange, ratio);
        
        // Ensure price doesn't go below end price
        if (price < endPrice) return endPrice;
    }

    /// @dev Helper function to remove tokenId from active list (optimized)
    /// @param tokenId The token ID to remove
    function _removeTokenIdFromActiveList(uint256 tokenId) internal {
        uint256 length = activeTokenIds.length;
        if (length == 0) return;
        
        // Optimized: check last element first (common case)
        if (activeTokenIds[length - 1] == tokenId) {
            activeTokenIds.pop();
            hasActiveAuction[tokenId] = false;
            return;
        }
        
        // Search from beginning if not last element
        for (uint256 i = 0; i < length - 1;) {
            if (activeTokenIds[i] == tokenId) {
                // Move the last element to the position of the element to delete
                activeTokenIds[i] = activeTokenIds[length - 1];
                activeTokenIds.pop();
                hasActiveAuction[tokenId] = false;
                return;
            }
            unchecked {
                ++i;
            }
        }
        // If we reach here, the tokenId was not found - this shouldn't happen
        // but we don't revert to prevent DoS attacks
    }

    /// @dev Check if this contract owns a specific NFT (to be implemented by inheriting contracts)
    /// @param tokenId The NFT token ID
    /// @return owned True if this contract owns the NFT
    function _isNFTOwner(uint256 tokenId) internal view virtual returns (bool owned);


    /// @dev Check if user has enough tokens (to be implemented by inheriting contracts)
    /// @param user The user address
    /// @param amount The token amount
    /// @return hasEnough True if user has enough tokens
    function _hasEnoughTokens(address user, uint256 amount) internal view virtual returns (bool hasEnough);


    /// @dev Transfer tokens from user to this contract (to be implemented by inheriting contracts)
    /// @param user The user address
    /// @param amount The token amount
    function _transferTokensFromUser(address user, uint256 amount) internal virtual;

    /// @dev Transfer NFT to user (to be implemented by inheriting contracts)
    /// @param tokenId The NFT token ID
    /// @param user The user address
    function _transferNFTToUser(uint256 tokenId, address user) internal virtual;

    function _prepareAuction(uint256 tokenId) internal virtual;
    function _settleAuction(uint256 tokenId, address buyer, uint256 price) internal virtual;
    function _cancelAuction(uint256 tokenId) internal virtual;
}