/**
 * Owner Direct Auction Script
 * 
 * Owner directly creates an auction without needing approval
 */

const hre = require("hardhat");

const CONFIG = {
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    ownerPrivateKey: "",
    nftTokenId: 8, // Change this to the NFT you want to list
    startPrice: hre.ethers.parseEther("0.11"), // Starting price in ETH worth of tokens
    endPrice: hre.ethers.parseEther("0.1"),    // Ending price in ETH worth of tokens
};

async function main() {
    console.log("👑 Owner Direct Auction Creation\n");

    const owner = new hre.ethers.Wallet(CONFIG.ownerPrivateKey, hre.ethers.provider);
    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);

    console.log("👤 Owner:", owner.address);
    console.log("🎯 NFT ID:", CONFIG.nftTokenId);
    console.log("💰 Start Price:", hre.ethers.formatEther(CONFIG.startPrice), "ETH worth of tokens");
    console.log("💰 End Price:", hre.ethers.formatEther(CONFIG.endPrice), "ETH worth of tokens");
    console.log();

    // Check if NFT is in strategy
    console.log("1. Checking NFT ownership...");
    const ERC721_ABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const nftCollection = new hre.ethers.Contract("0x2132e53a520da3783135016c2d1c03cbb4576433", ERC721_ABI, owner);
    
    const nftOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
    if (nftOwner.toLowerCase() !== CONFIG.strategyAddress.toLowerCase()) {
        console.log("❌ NFT is not in strategy contract");
        console.log("💡 Owner needs to transfer NFT to strategy first");
        return;
    }
    console.log("✅ NFT is in strategy contract");

    // Check for existing auction
    console.log("\n2. Checking for existing auction...");
    const auction = await strategy.auctions(CONFIG.nftTokenId);
    if (auction.active) {
        console.log("❌ NFT already has an active auction");
        return;
    }
    console.log("✅ No active auction");

    // Check for pending proposals
    console.log("\n3. Checking for pending proposals...");
    const hasPending = await strategy.hasPendingProposal(CONFIG.nftTokenId);
    if (hasPending) {
        console.log("❌ NFT already has a pending proposal");
        return;
    }
    console.log("✅ No pending proposals");

    // Create auction directly (owner privilege)
    console.log("\n4. Creating auction directly...");
    const startTx = await strategy.connect(owner).startAuction(
        CONFIG.nftTokenId,
        CONFIG.startPrice,
        CONFIG.endPrice
    );

    console.log("📡 Transaction submitted:", startTx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await startTx.wait();
    console.log("✅ Auction created!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

    // Get auction ID from events
    const auctionEvent = receipt.logs.find(log => {
        try {
            const parsed = strategy.interface.parseLog(log);
            return parsed.name === "AuctionStarted";
        } catch {
            return false;
        }
    });

    if (auctionEvent) {
        const parsed = strategy.interface.parseLog(auctionEvent);
        const auctionId = parsed.args.auctionId;
        console.log("\n🎯 Auction Details:");
        console.log(`   Auction ID: ${auctionId}`);
        console.log(`   Token ID: ${parsed.args.tokenId}`);
        console.log(`   Start Price: ${hre.ethers.formatEther(parsed.args.startPrice)} ETH worth of tokens`);
        console.log(`   End Price: ${hre.ethers.formatEther(parsed.args.endPrice)} ETH worth of tokens`);
    }

    // Check auction status
    console.log("\n5. Verifying auction status...");
    const newAuction = await strategy.auctions(CONFIG.nftTokenId);
    const currentPrice = await strategy.currentAuctionPrice(CONFIG.nftTokenId);
    
    console.log(`   Active: ${newAuction.active}`);
    console.log(`   Current Price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);

    console.log("\n🎉 Auction is now live and ready for bidding!");
    console.log("💡 Run solverbidding.js to bid on the auction");
}

main().catch(console.error);
