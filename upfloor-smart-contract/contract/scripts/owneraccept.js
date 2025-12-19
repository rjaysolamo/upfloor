/**
 * Owner Accept Script
 * 
 * Owner approves a pending auction proposal
 */

const hre = require("hardhat");

const CONFIG = {
    tokenAddress: "0x32142b31f4e97c37c5e6d00b1471676ea04bb20c", // Your token address
    ownerPrivateKey: process.env.PRIVATE_KEY, // Use environment variable for security
    proposalId: null, // Will be auto-detected or set manually
    network: "monadtestnet" // Change this to your network
};

async function main() {
    console.log("✅ Owner Accepting Proposal");
    console.log("========================================\n");

    // Get the token contract first
    const token = await hre.ethers.getContractAt("UpFloorToken", CONFIG.tokenAddress);
    
    // Get the strategy address from the token
    const strategyAddress = await token.strategy();
    console.log("📍 Token Address:", CONFIG.tokenAddress);
    console.log("📍 Strategy Address:", strategyAddress);
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

    // Get pending proposals
    console.log("1. Getting pending proposals...");
    const pendingIds = await strategy.getPendingProposalIds();
    console.log(`   Pending proposals: ${pendingIds.length}`);

    if (pendingIds.length === 0) {
        console.log("❌ No pending proposals found");
        return;
    }

    // Show all pending proposals
    console.log("\n2. Pending proposals:");
    for (const id of pendingIds) {
        const proposal = await strategy.getProposal(id);
        console.log(`   Proposal #${id}:`);
        console.log(`     Token ID: ${proposal.tokenId}`);
        console.log(`     Proposer: ${proposal.proposer}`);
        console.log(`     Start Price: ${hre.ethers.formatEther(proposal.startPrice)} ETH worth of tokens`);
        console.log(`     End Price: ${hre.ethers.formatEther(proposal.endPrice)} ETH worth of tokens`);
        console.log(`     Status: ${proposal.status}`);
        console.log();
    }

    // Use the first pending proposal or specified one
    const proposalId = CONFIG.proposalId || pendingIds[0];
    console.log(`3. Approving proposal #${proposalId}...`);

    // Get proposal details
    const proposal = await strategy.getProposal(proposalId);
    console.log(`   Token ID: ${proposal.tokenId}`);
    console.log(`   Proposer: ${proposal.proposer}`);
    console.log(`   Start Price: ${hre.ethers.formatEther(proposal.startPrice)} ETH worth of tokens`);
    console.log(`   End Price: ${hre.ethers.formatEther(proposal.endPrice)} ETH worth of tokens`);

    // Approve the proposal
    console.log("\n4. Submitting approval...");
    
    let approveTx;
    if (hre.network.name === "hyperevm") {
        // For HyperEVM, check if big blocks are needed
        const gasEstimate = await strategy.connect(owner).approveAuctionProposal.estimateGas(proposalId);
        console.log("📊 Estimated gas:", gasEstimate.toString());
        
        if (gasEstimate > 2000000n) {
            console.log("🌐 Using big blocks for HyperEVM...");
            const bigBlockGasPrice = await hre.ethers.provider.send("eth_bigBlockGasPrice", []);
            approveTx = await strategy.connect(owner).approveAuctionProposal(proposalId, {
                gasPrice: bigBlockGasPrice,
                gasLimit: gasEstimate * 120n / 100n // 20% buffer
            });
        } else {
            approveTx = await strategy.connect(owner).approveAuctionProposal(proposalId);
        }
    } else {
        approveTx = await strategy.connect(owner).approveAuctionProposal(proposalId);
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
    console.log("\n5. Checking auction status...");
    const auction = await strategy.auctions(proposal.tokenId);
    const currentPrice = await strategy.currentAuctionPrice(proposal.tokenId);
    
    console.log(`   Active: ${auction.active}`);
    console.log(`   Current Price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);

    console.log("\n🎉 Auction is now live and ready for bidding!");
    console.log("💡 Run solverbidding.js to bid on the auction");
}

main().catch(console.error);
