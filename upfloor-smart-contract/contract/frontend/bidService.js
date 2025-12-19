/**
 * Bid Service - Simplified Frontend for Accepting Bids
 */

import { ethers } from 'ethers';

// Contract Addresses (ApeChain)
const CONTRACT_ADDRESSES = {
    TOKEN: "0xc41670C04E162D3207Be18eef60C6341953B9B32",
    STRATEGY: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    ROUTER: "0x48BcB87056f38008ae1924a0d1a993D0954f65c9",
    NFT_COLLECTION: "0x2132e53a520da3783135016c2d1c03cbb4576433"
};

// Minimal ABIs for bidding only
const TOKEN_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function previewMint(uint256 amount) view returns (uint256)"
];

const STRATEGY_ABI = [
    "function getActiveTokenIds() view returns (uint256[])",
    "function auctions(uint256 tokenId) view returns (bool active, uint256 auctionId, uint256 tokenId, uint256 startTime, uint256 currentPrice, uint256 startPrice, uint256 endPrice)",
    "function currentAuctionPrice(uint256 tokenId) view returns (uint256)",
    "function minSellPrice() view returns (uint256)",
    "function maxAuctionDuration() view returns (uint256)",
    "function acceptBid(uint256 tokenId)",
    "event BidAccepted(uint256 indexed auctionId, uint256 indexed tokenId, address indexed buyer, uint256 price)"
];

const ROUTER_ABI = [
    "function mint(uint256 amount, address receiver) payable"
];

const NFT_ABI = [
    "function ownerOf(uint256 tokenId) view returns (address)"
];

class BidService {
    constructor(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        
        // Initialize contracts
        this.token = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN, TOKEN_ABI, signer);
        this.strategy = new ethers.Contract(CONTRACT_ADDRESSES.STRATEGY, STRATEGY_ABI, signer);
        this.router = new ethers.Contract(CONTRACT_ADDRESSES.ROUTER, ROUTER_ABI, signer);
        this.nftCollection = new ethers.Contract(CONTRACT_ADDRESSES.NFT_COLLECTION, NFT_ABI, signer);
    }

    // ==================== GET AUCTIONS ====================

    /**
     * Get all active auctions with current prices
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
                    isReadyToBid: currentPrice <= minSellPrice,
                    status: isExpired ? 'Expired' : (currentPrice <= minSellPrice ? 'Ready to Buy' : 'Price Decaying')
                });
            }

            return auctions;
        } catch (error) {
            console.error('Error fetching active auctions:', error);
            throw error;
        }
    }

    /**
     * Get specific auction details
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
                isReadyToBid: currentPrice <= minSellPrice,
                status: isExpired ? 'Expired' : (currentPrice <= minSellPrice ? 'Ready to Buy' : 'Price Decaying')
            };
        } catch (error) {
            console.error('Error fetching auction details:', error);
            throw error;
        }
    }

    // ==================== TOKEN OPERATIONS ====================

    /**
     * Get user's token balance
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
     * Get cost to mint tokens
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

    // ==================== BID OPERATIONS ====================

    /**
     * Accept bid / Buy NFT from auction
     */
    async buyNFT(tokenId) {
        try {
            const userAddress = await this.signer.getAddress();
            
            // Get current auction price
            const currentPrice = await this.strategy.currentAuctionPrice(tokenId);
            const currentPriceEth = ethers.formatEther(currentPrice);
            
            console.log(`Buying NFT #${tokenId} for ${currentPriceEth} tokens...`);
            
            // Check user's token balance
            const balance = await this.token.balanceOf(userAddress);
            const balanceEth = ethers.formatEther(balance);
            
            console.log(`User balance: ${balanceEth} tokens`);
            
            // Mint tokens if needed
            if (balance < currentPrice) {
                const needed = ethers.formatEther(currentPrice - balance);
                console.log(`Need to mint ${needed} more tokens...`);
                
                const mintCost = await this.getMintCost(needed);
                console.log(`Mint cost: ${mintCost} ETH`);
                
                const mintTx = await this.mintTokens(needed, userAddress);
                console.log('Tokens minted successfully!');
            }
            
            // Approve tokens for strategy
            console.log('Approving tokens...');
            const approveTx = await this.token.approve(CONTRACT_ADDRESSES.STRATEGY, currentPrice);
            await approveTx.wait();
            console.log('Tokens approved!');
            
            // Accept bid / Buy NFT
            console.log('Buying NFT...');
            const buyTx = await this.strategy.acceptBid(tokenId);
            const receipt = await buyTx.wait();
            console.log('NFT purchased successfully!');
            
            // Verify NFT ownership
            const newOwner = await this.nftCollection.ownerOf(tokenId);
            const isOwner = newOwner.toLowerCase() === userAddress.toLowerCase();
            
            return {
                success: true,
                tokenId,
                price: currentPriceEth,
                newOwner,
                isOwner,
                transactionHash: receipt.hash,
                receipt
            };
            
        } catch (error) {
            console.error('Error buying NFT:', error);
            throw error;
        }
    }

    /**
     * Check if user can buy NFT (has enough tokens)
     */
    async canBuyNFT(tokenId) {
        try {
            const userAddress = await this.signer.getAddress();
            const currentPrice = await this.strategy.currentAuctionPrice(tokenId);
            const balance = await this.token.balanceOf(userAddress);
            
            return {
                canBuy: balance >= currentPrice,
                currentPrice: ethers.formatEther(currentPrice),
                userBalance: ethers.formatEther(balance),
                needed: balance >= currentPrice ? 0 : ethers.formatEther(currentPrice - balance)
            };
        } catch (error) {
            console.error('Error checking if can buy:', error);
            throw error;
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Get user address
     */
    async getUserAddress() {
        return await this.signer.getAddress();
    }

    /**
     * Format time remaining
     */
    formatTimeRemaining(seconds) {
        if (seconds <= 0) return 'Expired';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Listen to bid events
     */
    onBidAccepted(callback) {
        this.strategy.on('BidAccepted', (auctionId, tokenId, buyer, price) => {
            callback({
                auctionId: Number(auctionId),
                tokenId: Number(tokenId),
                buyer,
                price: ethers.formatEther(price)
            });
        });
    }
}

export default BidService;
