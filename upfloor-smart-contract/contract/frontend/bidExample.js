/**
 * Simple Bid Example - Frontend Usage
 */

import { ethers } from 'ethers';
import BidService from './bidService.js';

// Initialize provider and signer
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Initialize bid service
const bidService = new BidService(provider, signer);

// ==================== SIMPLE USAGE EXAMPLES ====================

/**
 * Get all available auctions to buy
 */
async function getAvailableAuctions() {
    try {
        const auctions = await bidService.getActiveAuctions();
        
        console.log('Available Auctions:');
        auctions.forEach(auction => {
            console.log(`NFT #${auction.tokenId}: ${auction.currentPrice} tokens (${auction.status})`);
            console.log(`  Time remaining: ${bidService.formatTimeRemaining(auction.timeRemaining)}`);
        });
        
        return auctions;
    } catch (error) {
        console.error('Failed to get auctions:', error);
    }
}

/**
 * Buy a specific NFT
 */
async function buyNFT(tokenId) {
    try {
        console.log(`Attempting to buy NFT #${tokenId}...`);
        
        // Check if user can buy
        const canBuy = await bidService.canBuyNFT(tokenId);
        console.log('Can buy:', canBuy);
        
        if (!canBuy.canBuy) {
            console.log(`Need to mint ${canBuy.needed} more tokens`);
        }
        
        // Buy the NFT
        const result = await bidService.buyNFT(tokenId);
        
        if (result.success) {
            console.log(`✅ Successfully bought NFT #${tokenId}!`);
            console.log(`💰 Price: ${result.price} tokens`);
            console.log(`👤 New owner: ${result.newOwner}`);
            console.log(`🔗 Transaction: ${result.transactionHash}`);
        }
        
        return result;
    } catch (error) {
        console.error('Failed to buy NFT:', error);
    }
}

/**
 * Check user's token balance
 */
async function checkBalance() {
    try {
        const userAddress = await bidService.getUserAddress();
        const balance = await bidService.getTokenBalance(userAddress);
        
        console.log(`User: ${userAddress}`);
        console.log(`Token Balance: ${balance} XYZ tokens`);
        
        return { userAddress, balance };
    } catch (error) {
        console.error('Failed to check balance:', error);
    }
}

/**
 * Mint tokens if needed
 */
async function mintTokens(amount) {
    try {
        const userAddress = await bidService.getUserAddress();
        const mintCost = await bidService.getMintCost(amount);
        
        console.log(`Minting ${amount} tokens...`);
        console.log(`Cost: ${mintCost} ETH`);
        
        const receipt = await bidService.mintTokens(amount, userAddress);
        console.log('✅ Tokens minted successfully!');
        
        return receipt;
    } catch (error) {
        console.error('Failed to mint tokens:', error);
    }
}

// ==================== EVENT LISTENERS ====================

/**
 * Listen to successful purchases
 */
function setupPurchaseListener() {
    bidService.onBidAccepted((event) => {
        console.log(`🎉 Someone bought NFT #${event.tokenId}!`);
        console.log(`💰 Price: ${event.price} tokens`);
        console.log(`👤 Buyer: ${event.buyer}`);
        
        // Update UI here
        updateAuctionList();
    });
}

// ==================== UI HELPER FUNCTIONS ====================

/**
 * Update auction list in UI
 */
async function updateAuctionList() {
    try {
        const auctions = await getAvailableAuctions();
        
        // Update your UI here
        const auctionList = document.getElementById('auction-list');
        if (auctionList) {
            auctionList.innerHTML = '';
            
            auctions.forEach(auction => {
                const auctionElement = document.createElement('div');
                auctionElement.className = 'auction-item';
                auctionElement.innerHTML = `
                    <h3>NFT #${auction.tokenId}</h3>
                    <p>Price: ${auction.currentPrice} XYZ tokens</p>
                    <p>Status: ${auction.status}</p>
                    <p>Time: ${bidService.formatTimeRemaining(auction.timeRemaining)}</p>
                    <button onclick="buyNFT(${auction.tokenId})" ${auction.isExpired ? 'disabled' : ''}>
                        ${auction.isExpired ? 'Expired' : 'Buy Now'}
                    </button>
                `;
                auctionList.appendChild(auctionElement);
            });
        }
    } catch (error) {
        console.error('Failed to update auction list:', error);
    }
}

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
        setupPurchaseListener();
        
        // Load initial data
        await checkBalance();
        await updateAuctionList();
        
        console.log('✅ Application initialized successfully!');
        
    } catch (error) {
        console.error('❌ Failed to initialize:', error);
    }
}

// ==================== HTML INTEGRATION ====================

/**
 * Example HTML structure:
 * 
 * <div id="app">
 *   <h1>NFT Auctions</h1>
 *   
 *   <div id="user-info">
 *     <p>User: <span id="user-address"></span></p>
 *     <p>Balance: <span id="user-balance"></span> XYZ tokens</p>
 *   </div>
 *   
 *   <div id="auction-list">
 *     <!-- Auctions will be populated here -->
 *   </div>
 *   
 *   <button onclick="initialize()">Connect Wallet</button>
 * </div>
 */

// Make functions available globally for HTML onclick events
window.buyNFT = buyNFT;
window.initialize = initialize;
window.checkBalance = checkBalance;
window.mintTokens = mintTokens;

export {
    getAvailableAuctions,
    buyNFT,
    checkBalance,
    mintTokens,
    initialize
};
