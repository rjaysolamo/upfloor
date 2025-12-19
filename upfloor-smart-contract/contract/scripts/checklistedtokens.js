/**
 * Check Listed Tokens Script
 * 
 * Shows all active auctions with their current prices and details
 */

const hre = require("hardhat");

const CONFIG = {
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    nftCollectionAddress: "0x2132e53a520da3783135016c2d1c03cbb4576433",
};

async function main() {
    console.log("📋 Checking Listed Tokens (Active Auctions)\n");

    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);
    const ERC721_ABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const nftCollection = new hre.ethers.Contract(CONFIG.nftCollectionAddress, ERC721_ABI, hre.ethers.provider);

    console.log("🏪 Strategy Address:", CONFIG.strategyAddress);
    console.log("🎨 NFT Collection:", CONFIG.nftCollectionAddress);
    console.log();

    // Get auction configuration
    console.log("1. Auction Configuration:");
    const minSellPrice = await strategy.minSellPrice();
    const maxAuctionDuration = await strategy.maxAuctionDuration();
    console.log(`   Min Sell Price: ${hre.ethers.formatEther(minSellPrice)} ETH worth of tokens`);
    console.log(`   Max Duration: ${Number(maxAuctionDuration) / 3600} hours`);
    console.log();

    // Get all active token IDs
    console.log("2. Getting active auctions...");
    const activeTokenIds = await strategy.getActiveTokenIds();
    const activeCount = await strategy.getActiveAuctionCount();
    
    console.log(`   Total Active Auctions: ${activeCount}`);
    console.log(`   Active Token IDs: [${activeTokenIds.join(", ")}]`);
    console.log();

    if (activeTokenIds.length === 0) {
        console.log("❌ No active auctions found");
        console.log("💡 Create an auction using ownerdirectauction.js or listproposal.js");
        return;
    }

    // Check each active auction
    console.log("3. Active Auction Details:");
    console.log("=".repeat(80));
    
    for (let i = 0; i < activeTokenIds.length; i++) {
        const tokenId = activeTokenIds[i];
        console.log(`\n🎯 Auction #${i + 1} - Token ID: ${tokenId}`);
        console.log("-".repeat(40));
        
        try {
            // Get auction data
            const auction = await strategy.auctions(tokenId);
            const currentPrice = await strategy.currentAuctionPrice(tokenId);
            
            // Calculate time elapsed and remaining
            const timeElapsed = Math.floor(Date.now() / 1000) - Number(auction.startTime);
            const timeRemaining = Number(maxAuctionDuration) - timeElapsed;
            
            // Check if auction is expired
            const isExpired = timeElapsed > Number(maxAuctionDuration);
            
            console.log(`   Auction ID: ${auction.auctionId}`);
            console.log(`   Status: ${auction.active ? "🟢 Active" : "🔴 Inactive"}`);
            console.log(`   Start Time: ${new Date(Number(auction.startTime) * 1000).toLocaleString()}`);
            console.log(`   Time Elapsed: ${Math.floor(timeElapsed / 3600)}h ${Math.floor((timeElapsed % 3600) / 60)}m`);
            console.log(`   Time Remaining: ${isExpired ? "⏰ EXPIRED" : `${Math.floor(timeRemaining / 3600)}h ${Math.floor((timeRemaining % 3600) / 60)}m`}`);
            console.log(`   Start Price: ${hre.ethers.formatEther(auction.startPrice)} ETH worth of tokens`);
            console.log(`   End Price: ${hre.ethers.formatEther(auction.endPrice)} ETH worth of tokens`);
            console.log(`   Current Price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);
            
            // Calculate price decay percentage
            const priceDecay = ((Number(auction.startPrice) - Number(currentPrice)) / Number(auction.startPrice)) * 100;
            console.log(`   Price Decay: ${priceDecay.toFixed(2)}%`);
            
            // Check NFT ownership
            const nftOwner = await nftCollection.ownerOf(tokenId);
            console.log(`   NFT Owner: ${nftOwner}`);
            console.log(`   Owner Correct: ${nftOwner.toLowerCase() === CONFIG.strategyAddress.toLowerCase() ? "✅" : "❌"}`);
            
            // Show bidding status
            if (isExpired) {
                console.log(`   Status: ⏰ EXPIRED - No longer accepting bids`);
            } else if (currentPrice <= minSellPrice) {
                console.log(`   Status: 🎯 READY TO BID - At minimum price`);
            } else {
                console.log(`   Status: ⏳ DECAYING - Price still dropping`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error fetching auction data: ${error.message}`);
        }
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 SUMMARY:");
    console.log(`   Total Active Auctions: ${activeTokenIds.length}`);
    console.log(`   Ready to Bid: ${activeTokenIds.filter(async (id) => {
        try {
            const price = await strategy.currentAuctionPrice(id);
            return price <= minSellPrice;
        } catch {
            return false;
        }
    }).length}`);
    console.log("=".repeat(80));

    // Show how to bid
    if (activeTokenIds.length > 0) {
        console.log("\n💡 To bid on an auction:");
        console.log("   npx hardhat run scripts/solverbidding.js --network apechain");
        console.log("   (Make sure to update nftTokenId in the script)");
    }
}

main().catch(console.error);
