/**
 * Simple Proposal Script for Token ID 4343
 * 
 * Quick script to propose auction for NFT #4343
 */

const hre = require("hardhat");

// ===== CONFIGURATION =====
const CONFIG = {
    // Update these values for your setup
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa", // Your strategy contract address
    proposerPrivateKey: "YOUR_PRIVATE_KEY_HERE", // Your wallet private key
    nftCollectionAddress: "0xb600de0ebee70af4691dbf8a732be7791b6ce73a", // NFT contract address
    nftTokenId: 4343, // Token ID to propose
    
    // Pricing (adjust these based on market conditions)
    startPrice: hre.ethers.parseEther("0.5"), // Starting price (max price)
    endPrice: hre.ethers.parseEther("0.1"),   // Ending price (min price)
};

async function main() {
    console.log("🚀 Proposing Auction for NFT #4343\n");

    // Setup
    const proposer = new hre.ethers.Wallet(CONFIG.proposerPrivateKey, hre.ethers.provider);
    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);
    const nftCollection = new hre.ethers.Contract(
        CONFIG.nftCollectionAddress, 
        ["function ownerOf(uint256 tokenId) view returns (address)"], 
        proposer
    );

    console.log("📋 Proposal Details:");
    console.log(`   Proposer: ${proposer.address}`);
    console.log(`   NFT Contract: ${CONFIG.nftCollectionAddress}`);
    console.log(`   Token ID: ${CONFIG.nftTokenId}`);
    console.log(`   Start Price: ${hre.ethers.formatEther(CONFIG.startPrice)} ETH worth of tokens`);
    console.log(`   End Price: ${hre.ethers.formatEther(CONFIG.endPrice)} ETH worth of tokens`);
    console.log();

    // Quick checks
    console.log("🔍 Running checks...");
    
    // Check NFT ownership
    const nftOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
    if (nftOwner.toLowerCase() !== CONFIG.strategyAddress.toLowerCase()) {
        console.log("❌ NFT not in strategy contract");
        console.log(`   Current owner: ${nftOwner}`);
        console.log(`   Expected: ${CONFIG.strategyAddress}`);
        return;
    }
    console.log("✅ NFT is in strategy contract");

    // Check for existing auction
    const auction = await strategy.auctions(CONFIG.nftTokenId);
    if (auction.active) {
        console.log("❌ NFT already has an active auction");
        return;
    }
    console.log("✅ No active auction");

    // Check for pending proposals
    const hasPending = await strategy.hasPendingProposal(CONFIG.nftTokenId);
    if (hasPending) {
        console.log("❌ NFT already has a pending proposal");
        return;
    }
    console.log("✅ No pending proposals");

    // Submit proposal
    console.log("\n📝 Submitting proposal...");
    const tx = await strategy.connect(proposer).proposeAuction(
        CONFIG.nftTokenId,
        CONFIG.startPrice,
        CONFIG.endPrice
    );

    console.log(`📡 Transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log("✅ Proposal submitted!");

    // Get proposal ID from events
    const proposalEvent = receipt.logs.find(log => {
        try {
            const parsed = strategy.interface.parseLog(log);
            return parsed.name === "AuctionProposed";
        } catch {
            return false;
        }
    });

    if (proposalEvent) {
        const parsed = strategy.interface.parseLog(proposalEvent);
        console.log(`\n🎯 Proposal ID: ${parsed.args.proposalId}`);
        console.log("💡 Owner needs to approve this proposal to start the auction");
    }
}

main().catch(console.error);
