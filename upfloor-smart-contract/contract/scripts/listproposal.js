/**
 * List Proposal Script
 * 
 * Solver proposes an auction listing with price to owner
 */

const hre = require("hardhat");

const CONFIG = {
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    solverPrivateKey: "0xc9f18eb30619fcad3e2546ae07014007d9a426f5415c8d86353d4612995ff940",
    nftTokenId: 7, // Change this to the NFT you want to list
    startPrice: hre.ethers.parseEther("0.11"), // Starting price in ETH worth of tokens
    endPrice: hre.ethers.parseEther("0.1"),    // Ending price in ETH worth of tokens
};

async function main() {
    console.log("📝 Proposing Auction Listing\n");

    const solver = new hre.ethers.Wallet(CONFIG.solverPrivateKey, hre.ethers.provider);
    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);

    console.log("👤 Solver:", solver.address);
    console.log("🎯 NFT ID:", CONFIG.nftTokenId);
    console.log("💰 Start Price:", hre.ethers.formatEther(CONFIG.startPrice), "ETH worth of tokens");
    console.log("💰 End Price:", hre.ethers.formatEther(CONFIG.endPrice), "ETH worth of tokens");
    console.log();

    // Check if NFT is in strategy
    console.log("1. Checking NFT ownership...");
    const ERC721_ABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const nftCollection = new hre.ethers.Contract("0x2132e53a520da3783135016c2d1c03cbb4576433", ERC721_ABI, solver);
    
    const nftOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
    if (nftOwner.toLowerCase() !== CONFIG.strategyAddress.toLowerCase()) {
        console.log("❌ NFT is not in strategy contract");
        console.log("💡 Run transfernfttostrategy.js first");
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

    // Propose auction
    console.log("\n4. Proposing auction...");
    const proposeTx = await strategy.connect(solver).proposeAuction(
        CONFIG.nftTokenId,
        CONFIG.startPrice,
        CONFIG.endPrice
    );

    console.log("📡 Transaction submitted:", proposeTx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await proposeTx.wait();
    console.log("✅ Proposal submitted!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

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
        const proposalId = parsed.args.proposalId;
        console.log("\n📋 Proposal Details:");
        console.log(`   Proposal ID: ${proposalId}`);
        console.log(`   Token ID: ${parsed.args.tokenId}`);
        console.log(`   Proposer: ${parsed.args.proposer}`);
        console.log(`   Start Price: ${hre.ethers.formatEther(parsed.args.startPrice)} ETH worth of tokens`);
        console.log(`   End Price: ${hre.ethers.formatEther(parsed.args.endPrice)} ETH worth of tokens`);
    }

    console.log("\n🎯 Proposal submitted! Owner needs to approve it.");
    console.log("💡 Run owneraccept.js to approve this proposal");
}

main().catch(console.error);
