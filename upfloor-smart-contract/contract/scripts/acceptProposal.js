/**
 * Accept Specific Proposal Script
 * 
 * Owner approves a specific auction proposal by ID
 * 
 * Usage:
 *   npx hardhat run scripts/acceptProposal.js --network <network-name>
 *   
 * Or with specific proposal ID:
 *   PROPOSAL_ID=1 npx hardhat run scripts/acceptProposal.js --network <network-name>
 */

const hre = require("hardhat");

const CONFIG = {
    tokenAddress: "0x32142b31f4e97c37c5e6d00b1471676ea04bb20c", // Your token address
    ownerPrivateKey: process.env.PRIVATE_KEY, // Use environment variable for security
    proposalId: process.env.PROPOSAL_ID ? parseInt(process.env.PROPOSAL_ID) : 1, // Default to 1, or set via env var
    network: "monadtestnet" // Change this to your network
};

async function main() {
    console.log("✅ Owner Accepting Specific Proposal");
    console.log("========================================\n");

    // Get the token contract first
    const token = await hre.ethers.getContractAt("UpFloorToken", CONFIG.tokenAddress);
    
    // Get the strategy address from the token
    const strategyAddress = await token.strategy();
    console.log("📍 Token Address:", CONFIG.tokenAddress);
    console.log("📍 Strategy Address:", strategyAddress);
    console.log("🎯 Target Proposal ID:", CONFIG.proposalId);
    console.log();

    const owner = new hre.ethers.Wallet(CONFIG.ownerPrivateKey, hre.ethers.provider);
    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", strategyAddress);

    console.log("👤 Owner:", owner.address);
    
    // Verify owner is the actual owner of the strategy
    const strategyOwner = await strategy.owner();
    console.log("👑 Strategy Owner:", strategyOwner);
    
    if (owner.address.toLowerCase() !== strategyOwner.toLowerCase()) {
        console.log("❌ Error: You are not the owner of this strategy!");
        console.log("   Expected owner:", strategyOwner);
        console.log("   Your address:", owner.address);
        return;
    }
    console.log("✅ Owner verification passed");
    console.log();

    // Get the specific proposal details
    console.log("1. Getting proposal details...");
    try {
        const proposal = await strategy.getProposal(CONFIG.proposalId);
        
        if (proposal.status === 0) { // None
            console.log("❌ Error: Proposal does not exist!");
            return;
        }
        
        if (proposal.status === 2) { // Approved
            console.log("❌ Error: Proposal has already been approved!");
            return;
        }
        
        if (proposal.status === 3) { // Rejected
            console.log("❌ Error: Proposal has already been rejected!");
            return;
        }
        
        if (proposal.status !== 1) { // Not Pending
            console.log("❌ Error: Proposal is not in pending status!");
            console.log("   Current status:", proposal.status);
            return;
        }
        
        console.log("📋 Proposal Details:");
        console.log(`   Proposal ID: ${proposal.proposalId}`);
        console.log(`   Token ID: ${proposal.tokenId}`);
        console.log(`   Proposer: ${proposal.proposer}`);
        console.log(`   Start Price: ${hre.ethers.formatEther(proposal.startPrice)} ETH worth of tokens`);
        console.log(`   End Price: ${hre.ethers.formatEther(proposal.endPrice)} ETH worth of tokens`);
        console.log(`   Status: ${proposal.status} (Pending)`);
        console.log(`   Timestamp: ${new Date(Number(proposal.proposedAt) * 1000).toLocaleString()}`);
        console.log();
        
    } catch (error) {
        console.log("❌ Error getting proposal:", error.message);
        return;
    }

    // Approve the proposal
    console.log("2. Submitting approval...");
    
    let approveTx;
    try {
        approveTx = await strategy.connect(owner).approveAuctionProposal(CONFIG.proposalId);
    } catch (error) {
        console.log("❌ Error submitting approval:", error.message);
        return;
    }

    console.log("📡 Transaction submitted:", approveTx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await approveTx.wait();
    console.log("✅ Proposal approved!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

    // Get auction ID from events
    const auctionEvent = receipt.logs.find(log => {
        try {
            const parsed = strategy.interface.parseLog(log);
            return parsed.name === "AuctionProposalApproved";
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
    }

    // Check auction status
    console.log("\n3. Checking auction status...");
    const proposal = await strategy.getProposal(CONFIG.proposalId);
    const auction = await strategy.auctions(proposal.tokenId);
    const currentPrice = await strategy.currentAuctionPrice(proposal.tokenId);
    
    console.log(`   Active: ${auction.active}`);
    console.log(`   Current Price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);

    console.log("\n🎉 Auction is now live and ready for bidding!");
    console.log("💡 Run solverbidding.js to bid on the auction");
    
    console.log("\n========================================");
    console.log("✅ Proposal Acceptance Complete!");
    console.log("========================================\n");
}

main().catch(console.error);
