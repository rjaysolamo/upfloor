/**
 * Check Proposals Script
 * 
 * Check pending and active proposals for a specific token
 */

const hre = require("hardhat");

const CONFIG = {
    tokenAddress: "0x32142b31f4e97c37c5e6d00b1471676ea04bb20c", // Your token address
    network: "monadtestnet" // Change this to your network
};

async function main() {
    console.log("🔍 Checking Proposals for Token");
    console.log("========================================\n");

    // Get the token contract
    const token = await hre.ethers.getContractAt("UpFloorToken", CONFIG.tokenAddress);
    
    // Get the strategy address from the token
    const strategyAddress = await token.strategy();
    console.log("📍 Token Address:", CONFIG.tokenAddress);
    console.log("📍 Strategy Address:", strategyAddress);
    console.log();

    // Get the strategy contract
    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", strategyAddress);

    // Get token info
    const tokenName = await token.name();
    const tokenSymbol = await token.symbol();
    console.log("📋 Token Info:");
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log();

    // Check if there are any pending proposals
    console.log("1. Checking Pending Proposals...");
    const pendingIds = await strategy.getPendingProposalIds();
    console.log(`   Found ${pendingIds.length} pending proposals`);

    if (pendingIds.length > 0) {
        console.log("\n📝 Pending Proposals:");
        console.log("─────────────────────────────────────");
        
        for (const id of pendingIds) {
            const proposal = await strategy.getProposal(id);
            console.log(`\n   Proposal #${id}:`);
            console.log(`     Token ID: ${proposal.tokenId}`);
            console.log(`     Proposer: ${proposal.proposer}`);
            console.log(`     Start Price: ${hre.ethers.formatEther(proposal.startPrice)} ETH worth of tokens`);
            console.log(`     End Price: ${hre.ethers.formatEther(proposal.endPrice)} ETH worth of tokens`);
            console.log(`     Status: ${proposal.status}`);
            console.log(`     Timestamp: ${new Date(Number(proposal.timestamp) * 1000).toLocaleString()}`);
        }
    }

    // Check active auctions
    console.log("\n2. Checking Active Auctions...");
    
    // Get all token IDs that might have auctions
    // We'll check a range of token IDs (adjust as needed)
    const maxTokenId = 100; // Adjust this based on your collection size
    const activeAuctions = [];

    for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
        try {
            const auction = await strategy.auctions(tokenId);
            if (auction.active) {
                activeAuctions.push({
                    tokenId: tokenId,
                    auction: auction
                });
            }
        } catch (error) {
            // Token ID might not exist, continue
            continue;
        }
    }

    console.log(`   Found ${activeAuctions.length} active auctions`);

    if (activeAuctions.length > 0) {
        console.log("\n🎯 Active Auctions:");
        console.log("─────────────────────────────────────");
        
        for (const { tokenId, auction } of activeAuctions) {
            const currentPrice = await strategy.currentAuctionPrice(tokenId);
            console.log(`\n   Token ID: ${tokenId}`);
            console.log(`     Start Price: ${hre.ethers.formatEther(auction.startPrice)} ETH worth of tokens`);
            console.log(`     End Price: ${hre.ethers.formatEther(auction.endPrice)} ETH worth of tokens`);
            console.log(`     Current Price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);
            console.log(`     Start Time: ${new Date(Number(auction.startTime) * 1000).toLocaleString()}`);
            console.log(`     End Time: ${new Date(Number(auction.endTime) * 1000).toLocaleString()}`);
            console.log(`     Active: ${auction.active}`);
        }
    }

    // Check recent events for proposals
    console.log("\n3. Checking Recent Proposal Events...");
    
    try {
        // Get recent ProposalSubmitted events
        const filter = strategy.filters.ProposalSubmitted();
        const events = await strategy.queryFilter(filter, -1000); // Last 1000 blocks
        
        if (events.length > 0) {
            console.log(`   Found ${events.length} recent proposal events`);
            console.log("\n📅 Recent Proposals:");
            console.log("─────────────────────────────────────");
            
            for (const event of events.slice(-5)) { // Show last 5
                const { proposalId, proposer, tokenId, startPrice, endPrice } = event.args;
                console.log(`\n   Proposal #${proposalId}:`);
                console.log(`     Token ID: ${tokenId}`);
                console.log(`     Proposer: ${proposer}`);
                console.log(`     Start Price: ${hre.ethers.formatEther(startPrice)} ETH worth of tokens`);
                console.log(`     End Price: ${hre.ethers.formatEther(endPrice)} ETH worth of tokens`);
                console.log(`     Block: ${event.blockNumber}`);
            }
        } else {
            console.log("   No recent proposal events found");
        }
    } catch (error) {
        console.log("   Error fetching events:", error.message);
    }

    console.log("\n========================================");
    console.log("✅ Proposal Check Complete!");
    console.log("========================================\n");

    // Summary
    console.log("📊 Summary:");
    console.log(`   Pending Proposals: ${pendingIds.length}`);
    console.log(`   Active Auctions: ${activeAuctions.length}`);
    
    if (pendingIds.length > 0) {
        console.log("\n💡 To approve a proposal, run:");
        console.log("   npx hardhat run scripts/owneraccept.js --network hyperevm");
    }
    
    if (activeAuctions.length > 0) {
        console.log("\n💡 To bid on an auction, run:");
        console.log("   npx hardhat run scripts/solverbidding.js --network hyperevm");
    }
}

main().catch(console.error);
