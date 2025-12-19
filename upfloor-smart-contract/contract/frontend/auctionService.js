/**
 * Auction Service - Frontend Ethers.js Implementation
 */

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, TOKEN_ABI, STRATEGY_ABI, ROUTER_ABI, NFT_ABI } from './contracts.js';

class AuctionService {
    constructor(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        
        // Initialize contracts
        this.token = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN, TOKEN_ABI, signer);
        this.strategy = new ethers.Contract(CONTRACT_ADDRESSES.STRATEGY, STRATEGY_ABI, signer);
        this.router = new ethers.Contract(CONTRACT_ADDRESSES.ROUTER, ROUTER_ABI, signer);
        this.nftCollection = new ethers.Contract(CONTRACT_ADDRESSES.NFT_COLLECTION, NFT_ABI, signer);
    }

    // ==================== AUCTION QUERIES ====================

    /**
     * Get all active auctions
     */
    async getActiveAuctions() {
        try {
            const activeTokenIds = await this.strategy.getActiveTokenIds();
            const auctions = [];

            for (const tokenId of activeTokenIds) {
                const auction = await this.strategy.auctions(tokenId);
                const currentPrice = await this.strategy.currentAuctionPrice(tokenId);
                const minSellPrice = await this.strategy.minSellPrice();
                
                // Calculate time remaining
                const timeElapsed = Math.floor(Date.now() / 1000) - Number(auction.startTime);
                const maxDuration = await this.strategy.maxAuctionDuration();
                const timeRemaining = Number(maxDuration) - timeElapsed;
                const isExpired = timeElapsed > Number(maxDuration);

                auctions.push({
                    tokenId: Number(tokenId),
                    auctionId: Number(auction.auctionId),
                    active: auction.active,
                    startTime: Number(auction.startTime),
                    startPrice: ethers.formatEther(auction.startPrice),
                    endPrice: ethers.formatEther(auction.endPrice),
                    currentPrice: ethers.formatEther(currentPrice),
                    minSellPrice: ethers.formatEther(minSellPrice),
                    timeElapsed,
                    timeRemaining: Math.max(0, timeRemaining),
                    isExpired,
                    isReadyToBid: currentPrice <= minSellPrice
                });
            }

            return auctions;
        } catch (error) {
            console.error('Error fetching active auctions:', error);
            throw error;
        }
    }

    /**
     * Get auction details for a specific token
     */
    async getAuctionDetails(tokenId) {
        try {
            const auction = await this.strategy.auctions(tokenId);
            const currentPrice = await this.strategy.currentAuctionPrice(tokenId);
            const minSellPrice = await this.strategy.minSellPrice();
            const maxDuration = await this.strategy.maxAuctionDuration();

            const timeElapsed = Math.floor(Date.now() / 1000) - Number(auction.startTime);
            const timeRemaining = Number(maxDuration) - timeElapsed;
            const isExpired = timeElapsed > Number(maxDuration);

            return {
                tokenId: Number(tokenId),
                auctionId: Number(auction.auctionId),
                active: auction.active,
                startTime: Number(auction.startTime),
                startPrice: ethers.formatEther(auction.startPrice),
                endPrice: ethers.formatEther(auction.endPrice),
                currentPrice: ethers.formatEther(currentPrice),
                minSellPrice: ethers.formatEther(minSellPrice),
                timeElapsed,
                timeRemaining: Math.max(0, timeRemaining),
                isExpired,
                isReadyToBid: currentPrice <= minSellPrice
            };
        } catch (error) {
            console.error('Error fetching auction details:', error);
            throw error;
        }
    }

    /**
     * Get pending proposals
     */
    async getPendingProposals() {
        try {
            const pendingIds = await this.strategy.getPendingProposalIds();
            const proposals = [];

            for (const id of pendingIds) {
                const proposal = await this.strategy.getProposal(id);
                proposals.push({
                    proposalId: Number(proposal.proposalId),
                    tokenId: Number(proposal.tokenId),
                    proposer: proposal.proposer,
                    startPrice: ethers.formatEther(proposal.startPrice),
                    endPrice: ethers.formatEther(proposal.endPrice),
                    proposedAt: Number(proposal.proposedAt),
                    status: Number(proposal.status) // 0: Pending, 1: Approved, 2: Rejected
                });
            }

            return proposals;
        } catch (error) {
            console.error('Error fetching pending proposals:', error);
            throw error;
        }
    }

    // ==================== TOKEN OPERATIONS ====================

    /**
     * Get token balance for user
     */
    async getTokenBalance(address) {
        try {
            const balance = await this.token.balanceOf(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error fetching token balance:', error);
            throw error;
        }
    }

    /**
     * Get mint cost for amount of tokens
     */
    async getMintCost(amount) {
        try {
            const cost = await this.token.previewMint(ethers.parseEther(amount.toString()));
            return ethers.formatEther(cost);
        } catch (error) {
            console.error('Error fetching mint cost:', error);
            throw error;
        }
    }

    /**
     * Mint tokens
     */
    async mintTokens(amount, receiver) {
        try {
            const mintAmount = ethers.parseEther(amount.toString());
            const mintCost = await this.token.previewMint(mintAmount);
            
            const tx = await this.router.mint(mintAmount, receiver, {
                value: mintCost
            });
            
            return await tx.wait();
        } catch (error) {
            console.error('Error minting tokens:', error);
            throw error;
        }
    }

    // ==================== AUCTION OPERATIONS ====================

    /**
     * Accept bid on auction
     */
    async acceptBid(tokenId) {
        try {
            // Get current price
            const currentPrice = await this.strategy.currentAuctionPrice(tokenId);
            
            // Check if user has enough tokens
            const userAddress = await this.signer.getAddress();
            const balance = await this.token.balanceOf(userAddress);
            
            if (balance < currentPrice) {
                throw new Error(`Insufficient tokens. Need ${ethers.formatEther(currentPrice)}, have ${ethers.formatEther(balance)}`);
            }

            // Approve tokens for strategy
            const approveTx = await this.token.approve(CONTRACT_ADDRESSES.STRATEGY, currentPrice);
            await approveTx.wait();

            // Accept bid
            const tx = await this.strategy.acceptBid(tokenId);
            return await tx.wait();
        } catch (error) {
            console.error('Error accepting bid:', error);
            throw error;
        }
    }

    /**
     * Propose auction (solver only)
     */
    async proposeAuction(tokenId, startPrice, endPrice) {
        try {
            const tx = await this.strategy.proposeAuction(
                tokenId,
                ethers.parseEther(startPrice.toString()),
                ethers.parseEther(endPrice.toString())
            );
            return await tx.wait();
        } catch (error) {
            console.error('Error proposing auction:', error);
            throw error;
        }
    }

    /**
     * Approve auction proposal (owner only)
     */
    async approveProposal(proposalId) {
        try {
            const tx = await this.strategy.approveAuctionProposal(proposalId);
            return await tx.wait();
        } catch (error) {
            console.error('Error approving proposal:', error);
            throw error;
        }
    }

    /**
     * Reject auction proposal (owner only)
     */
    async rejectProposal(proposalId) {
        try {
            const tx = await this.strategy.rejectAuctionProposal(proposalId);
            return await tx.wait();
        } catch (error) {
            console.error('Error rejecting proposal:', error);
            throw error;
        }
    }

    /**
     * Start auction directly (owner only)
     */
    async startAuction(tokenId, startPrice, endPrice) {
        try {
            const tx = await this.strategy.startAuction(
                tokenId,
                ethers.parseEther(startPrice.toString()),
                ethers.parseEther(endPrice.toString())
            );
            return await tx.wait();
        } catch (error) {
            console.error('Error starting auction:', error);
            throw error;
        }
    }

    /**
     * Cancel auction (owner only)
     */
    async cancelAuction(tokenId) {
        try {
            const tx = await this.strategy.cancelAuctionListing(tokenId);
            return await tx.wait();
        } catch (error) {
            console.error('Error canceling auction:', error);
            throw error;
        }
    }

    // ==================== NFT OPERATIONS ====================

    /**
     * Get NFT owner
     */
    async getNFTOwner(tokenId) {
        try {
            return await this.nftCollection.ownerOf(tokenId);
        } catch (error) {
            console.error('Error fetching NFT owner:', error);
            throw error;
        }
    }

    /**
     * Transfer NFT (using executeExternalCall)
     */
    async transferNFT(from, to, tokenId) {
        try {
            const iface = new ethers.Interface([
                "function safeTransferFrom(address from, address to, uint256 tokenId)"
            ]);
            
            const calldata = iface.encodeFunctionData("safeTransferFrom", [from, to, tokenId]);
            
            const tx = await this.token.executeExternalCall(
                CONTRACT_ADDRESSES.NFT_COLLECTION,
                0,
                calldata
            );
            
            return await tx.wait();
        } catch (error) {
            console.error('Error transferring NFT:', error);
            throw error;
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Check if user is owner
     */
    async isOwner() {
        try {
            const owner = await this.strategy.owner();
            const userAddress = await this.signer.getAddress();
            return owner.toLowerCase() === userAddress.toLowerCase();
        } catch (error) {
            console.error('Error checking ownership:', error);
            return false;
        }
    }

    /**
     * Get contract configuration
     */
    async getConfig() {
        try {
            const minSellPrice = await this.strategy.minSellPrice();
            const maxDuration = await this.strategy.maxAuctionDuration();
            
            return {
                minSellPrice: ethers.formatEther(minSellPrice),
                maxDuration: Number(maxDuration),
                maxDurationHours: Number(maxDuration) / 3600
            };
        } catch (error) {
            console.error('Error fetching config:', error);
            throw error;
        }
    }
}

export default AuctionService;
