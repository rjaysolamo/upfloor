/**
 * Quick Check Auctions Script
 * 
 * Simple script to quickly check active auctions and their current prices
 */

const hre = require("hardhat");

const CONFIG = {
    strategyAddress: "0xB0e55fDF2E08B6aEd86C396769a1c7bEC4Bc65dB",
};

async function main() {
    console.log("⚡ Quick Auction Check\n");

    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);

    // Get active auctions
    const activeTokenIds = await strategy.getActiveTokenIds();
    const activeCount = await strategy.getActiveAuctionCount();
    
    console.log(`🎯 Active Auctions: ${activeCount}`);
    
    if (activeCount === 0) {
        console.log("❌ No active auctions");
        return;
    }

    console.log("\n📋 Auction List:");
    console.log("Token ID | Current Price (ETH) | Status");
    console.log("-".repeat(45));

    for (const tokenId of activeTokenIds) {
        try {
            const auction = await strategy.auctions(tokenId);
            const currentPrice = await strategy.currentAuctionPrice(tokenId);
            const minSellPrice = await strategy.minSellPrice();
            
            const priceEth = hre.ethers.formatEther(currentPrice);
            const status = currentPrice <= minSellPrice ? "🎯 Ready" : "⏳ Decaying";
            
            console.log(`${tokenId.toString().padStart(8)} | ${priceEth.padStart(18)} | ${status}`);
        } catch (error) {
            console.log(`${tokenId.toString().padStart(8)} | Error: ${error.message}`);
        }
    }

    console.log("\n💡 To bid: npx hardhat run scripts/solverbidding.js --network apechain");
}

main().catch(console.error);
