/**
 * Cancel Auction Script
 * 
 * Owner cancels an active auction and returns NFT to owner
 */

const hre = require("hardhat");

const CONFIG = {
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa", // Original deployment
    // strategyAddress: "0xB0e55fDF2E08B6aEd86C396769a1c7bEC4Bc65dB", // Alternative deployment
    ownerPrivateKey: "0xc6167b8017f0c8c97fe4cfda7eb471c48e0f4eede558fccc3a50c596f56986f6",
    nftTokenId: null, // Will be auto-detected or set manually
};

async function main() {
    console.log("❌ Cancel Auction Script\n");

    const owner = new hre.ethers.Wallet(CONFIG.ownerPrivateKey, hre.ethers.provider);
    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);

    console.log("👤 Owner:", owner.address);
    console.log();

    // Get active auctions
    console.log("1. Checking active auctions...");
    const activeTokenIds = await strategy.getActiveTokenIds();
    const activeCount = await strategy.getActiveAuctionCount();
    
    console.log(`   Active Auctions: ${activeCount}`);
    
    if (activeCount === 0) {
        console.log("❌ No active auctions to cancel");
        return;
    }

    // Show active auctions
    console.log("\n2. Active Auctions:");
    console.log("Token ID | Current Price (ETH) | Status");
    console.log("-".repeat(45));

    for (const tokenId of activeTokenIds) {
        try {
            const auction = await strategy.auctions(tokenId);
            const currentPrice = await strategy.currentAuctionPrice(tokenId);
            const priceEth = hre.ethers.formatEther(currentPrice);
            const status = auction.active ? "🟢 Active" : "🔴 Inactive";
            
            console.log(`${tokenId.toString().padStart(8)} | ${priceEth.padStart(18)} | ${status}`);
        } catch (error) {
            console.log(`${tokenId.toString().padStart(8)} | Error: ${error.message}`);
        }
    }

    // Determine which auction to cancel
    let tokenIdToCancel = CONFIG.nftTokenId;
    
    if (!tokenIdToCancel) {
        // Use the first active auction
        tokenIdToCancel = activeTokenIds[0];
        console.log(`\n3. Auto-selecting first active auction: Token ID ${tokenIdToCancel}`);
    } else {
        console.log(`\n3. Using specified Token ID: ${tokenIdToCancel}`);
    }

    // Verify the auction exists and is active
    console.log("\n4. Verifying auction...");
    try {
        const auction = await strategy.auctions(tokenIdToCancel);
        
        if (!auction.active) {
            console.log("❌ Auction is not active");
            return;
        }
        
        console.log(`   Auction ID: ${auction.auctionId}`);
        console.log(`   Start Price: ${hre.ethers.formatEther(auction.startPrice)} ETH worth of tokens`);
        console.log(`   End Price: ${hre.ethers.formatEther(auction.endPrice)} ETH worth of tokens`);
        
        const currentPrice = await strategy.currentAuctionPrice(tokenIdToCancel);
        console.log(`   Current Price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);
        
    } catch (error) {
        console.log("❌ Error verifying auction:", error.message);
        return;
    }

    // Check NFT ownership before cancellation
    console.log("\n5. Checking NFT ownership...");
    const ERC721_ABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const nftCollection = new hre.ethers.Contract("0x2132e53a520da3783135016c2d1c03cbb4576433", ERC721_ABI, owner);
    
    try {
        const nftOwner = await nftCollection.ownerOf(tokenIdToCancel);
        console.log(`   Current NFT Owner: ${nftOwner}`);
        console.log(`   Strategy Address: ${CONFIG.strategyAddress}`);
        console.log(`   NFT in Strategy: ${nftOwner.toLowerCase() === CONFIG.strategyAddress.toLowerCase() ? "✅" : "❌"}`);
    } catch (error) {
        console.log("❌ Error checking NFT ownership:", error.message);
    }

    // Cancel the auction
    console.log("\n6. Canceling auction...");
    try {
        const cancelTx = await strategy.connect(owner).cancelAuctionListing(tokenIdToCancel);
        
        console.log("📡 Transaction submitted:", cancelTx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await cancelTx.wait();
        console.log("✅ Auction canceled!");
        console.log("   Block:", receipt.blockNumber);
        console.log("   Gas used:", receipt.gasUsed.toString());

        // Get auction cancellation event
        const cancelEvent = receipt.logs.find(log => {
            try {
                const parsed = strategy.interface.parseLog(log);
                return parsed.name === "AuctionCancelled";
            } catch {
                return false;
            }
        });

        if (cancelEvent) {
            const parsed = strategy.interface.parseLog(cancelEvent);
            console.log("\n📋 Cancellation Details:");
            console.log(`   Auction ID: ${parsed.args.auctionId}`);
            console.log(`   Token ID: ${parsed.args.tokenId}`);
        }

    } catch (error) {
        console.log("❌ Error canceling auction:", error.message);
        return;
    }

    // Verify cancellation
    console.log("\n7. Verifying cancellation...");
    try {
        const auction = await strategy.auctions(tokenIdToCancel);
        console.log(`   Auction Active: ${auction.active}`);
        console.log(`   Cancellation successful: ${!auction.active ? "✅" : "❌"}`);
        
        // Check if NFT was returned to owner
        const nftOwner = await nftCollection.ownerOf(tokenIdToCancel);
        console.log(`   NFT Owner after cancellation: ${nftOwner}`);
        console.log(`   NFT returned to owner: ${nftOwner.toLowerCase() === owner.address.toLowerCase() ? "✅" : "❌"}`);
        
    } catch (error) {
        console.log("❌ Error verifying cancellation:", error.message);
    }

    // Show remaining active auctions
    console.log("\n8. Remaining active auctions...");
    const remainingActive = await strategy.getActiveTokenIds();
    console.log(`   Remaining Active Auctions: ${remainingActive.length}`);
    
    if (remainingActive.length > 0) {
        console.log(`   Remaining Token IDs: [${remainingActive.join(", ")}]`);
    }

    console.log("\n🎉 Auction cancellation completed!");
    console.log("💡 NFT has been returned to the owner");
}

main().catch(console.error);
