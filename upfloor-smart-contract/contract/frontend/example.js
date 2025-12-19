/**
 * Example Frontend Implementation
 */

import { ethers } from 'ethers';
import AuctionService from './auctionService.js';

// Initialize provider and signer
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Initialize auction service
const auctionService = new AuctionService(provider, signer);

// ==================== EXAMPLE USAGE ====================

/**
 * Example: Get all active auctions
 */
async function getActiveAuctions() {
    try {
        const auctions = await auctionService.getActiveAuctions();
        console.log('Active Auctions:', auctions);
        
        // Display auctions in UI
        auctions.forEach(auction => {
            console.log(`Token #${auction.tokenId}: ${auction.currentPrice} ETH (${auction.isReadyToBid ? 'Ready to bid' : 'Decaying'})`);
        });
        
        return auctions;
    } catch (error) {
        console.error('Failed to get auctions:', error);
    }
}

/**
 * Example: Accept bid on auction
 */
async function acceptBid(tokenId) {
    try {
        console.log(`Accepting bid on Token #${tokenId}...`);
        
        // Check if user has enough tokens
        const userAddress = await signer.getAddress();
        const balance = await auctionService.getTokenBalance(userAddress);
        console.log(`User token balance: ${balance}`);
        
        // Get auction details
        const auction = await auctionService.getAuctionDetails(tokenId);
        console.log(`Current price: ${auction.currentPrice} ETH`);
        
        // Mint tokens if needed
        if (parseFloat(balance) < parseFloat(auction.currentPrice)) {
            const needed = parseFloat(auction.currentPrice) - parseFloat(balance);
            console.log(`Minting ${needed} tokens...`);
            
            const mintCost = await auctionService.getMintCost(needed);
            console.log(`Mint cost: ${mintCost} ETH`);
            
            await auctionService.mintTokens(needed, userAddress);
            console.log('Tokens minted successfully!');
        }
        
        // Accept bid
        const receipt = await auctionService.acceptBid(tokenId);
        console.log('Bid accepted!', receipt);
        
        // Verify NFT ownership
        const newOwner = await auctionService.getNFTOwner(tokenId);
        console.log(`NFT #${tokenId} new owner: ${newOwner}`);
        
    } catch (error) {
        console.error('Failed to accept bid:', error);
    }
}

/**
 * Example: Propose auction (solver)
 */
async function proposeAuction(tokenId, startPrice, endPrice) {
    try {
        console.log(`Proposing auction for Token #${tokenId}...`);
        
        const receipt = await auctionService.proposeAuction(tokenId, startPrice, endPrice);
        console.log('Auction proposed!', receipt);
        
        // Get proposal ID from events
        const proposalEvent = receipt.logs.find(log => {
            try {
                const parsed = auctionService.strategy.interface.parseLog(log);
                return parsed.name === 'AuctionProposed';
            } catch {
                return false;
            }
        });
        
        if (proposalEvent) {
            const parsed = auctionService.strategy.interface.parseLog(proposalEvent);
            console.log(`Proposal ID: ${parsed.args.proposalId}`);
        }
        
    } catch (error) {
        console.error('Failed to propose auction:', error);
    }
}

/**
 * Example: Approve proposal (owner)
 */
async function approveProposal(proposalId) {
    try {
        console.log(`Approving proposal #${proposalId}...`);
        
        const receipt = await auctionService.approveProposal(proposalId);
        console.log('Proposal approved!', receipt);
        
    } catch (error) {
        console.error('Failed to approve proposal:', error);
    }
}

/**
 * Example: Start auction directly (owner)
 */
async function startAuction(tokenId, startPrice, endPrice) {
    try {
        console.log(`Starting auction for Token #${tokenId}...`);
        
        const receipt = await auctionService.startAuction(tokenId, startPrice, endPrice);
        console.log('Auction started!', receipt);
        
    } catch (error) {
        console.error('Failed to start auction:', error);
    }
}

/**
 * Example: Get pending proposals
 */
async function getPendingProposals() {
    try {
        const proposals = await auctionService.getPendingProposals();
        console.log('Pending Proposals:', proposals);
        
        proposals.forEach(proposal => {
            console.log(`Proposal #${proposal.proposalId}: Token #${proposal.tokenId} - ${proposal.startPrice} to ${proposal.endPrice} ETH`);
        });
        
        return proposals;
    } catch (error) {
        console.error('Failed to get proposals:', error);
    }
}

/**
 * Example: Check user permissions
 */
async function checkPermissions() {
    try {
        const isOwner = await auctionService.isOwner();
        const userAddress = await signer.getAddress();
        
        console.log(`User: ${userAddress}`);
        console.log(`Is Owner: ${isOwner}`);
        
        if (isOwner) {
            console.log('User can: start auctions, approve/reject proposals, cancel auctions');
        } else {
            console.log('User can: propose auctions, bid on auctions');
        }
        
    } catch (error) {
        console.error('Failed to check permissions:', error);
    }
}

// ==================== EVENT LISTENERS ====================

/**
 * Listen to auction events
 */
function setupEventListeners() {
    // Listen to auction started events
    auctionService.strategy.on('AuctionStarted', (auctionId, tokenId, startPrice, endPrice) => {
        console.log(`Auction Started: #${auctionId} for Token #${tokenId}`);
        console.log(`Price: ${ethers.formatEther(startPrice)} to ${ethers.formatEther(endPrice)} ETH`);
    });
    
    // Listen to bid accepted events
    auctionService.strategy.on('BidAccepted', (auctionId, tokenId, buyer, price) => {
        console.log(`Bid Accepted: Auction #${auctionId} by ${buyer}`);
        console.log(`Token #${tokenId} sold for ${ethers.formatEther(price)} ETH`);
    });
    
    // Listen to auction cancelled events
    auctionService.strategy.on('AuctionCancelled', (auctionId, tokenId) => {
        console.log(`Auction Cancelled: #${auctionId} for Token #${tokenId}`);
    });
}

// ==================== INITIALIZATION ====================

/**
 * Initialize the application
 */
async function initialize() {
    try {
        // Check if wallet is connected
        if (!window.ethereum) {
            throw new Error('Please install MetaMask!');
        }
        
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        await getActiveAuctions();
        await getPendingProposals();
        await checkPermissions();
        
        console.log('Application initialized successfully!');
        
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
}

// Export functions for use in your app
export {
    getActiveAuctions,
    acceptBid,
    proposeAuction,
    approveProposal,
    startAuction,
    getPendingProposals,
    checkPermissions,
    initialize
};
