/**
 * Community Proposal Script for Token ID 4343
 * 
 * Community member proposes an auction listing for NFT #4343
 */

const hre = require("hardhat");

const CONFIG = {
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa", // Update this to your strategy address
    proposerPrivateKey: "0xc9f18eb30619fcad3e2546ae07014007d9a426f5415c8d86353d4612995ff940", // Update with your private key
    nftCollectionAddress: "0xb600de0ebee70af4691dbf8a732be7791b6ce73a", // Your NFT contract address
    nftTokenId: 4343, // Token ID to propose
    startPrice: hre.ethers.parseEther("0.5"), // Starting price in ETH worth of tokens (adjust as needed)
    endPrice: hre.ethers.parseEther("0.1"),   // Ending price in ETH worth of tokens (adjust as needed)
};

async function main() {
    console.log("📝 Community Proposal for NFT #4343\n");

    const proposer = new hre.ethers.Wallet(CONFIG.proposerPrivateKey, hre.ethers.provider);
    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);

    console.log("👤 Proposer:", proposer.address);
    console.log("🎯 NFT Contract:", CONFIG.nftCollectionAddress);
    console.log("🎯 NFT Token ID:", CONFIG.nftTokenId);
    console.log("💰 Start Price:", hre.ethers.formatEther(CONFIG.startPrice), "ETH worth of tokens");
    console.log("💰 End Price:", hre.ethers.formatEther(CONFIG.endPrice), "ETH worth of tokens");
    console.log();

    // Check if NFT is in strategy
    console.log("1. Checking NFT ownership...");
    const ERC721_ABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const nftCollection = new hre.ethers.Contract(CONFIG.nftCollectionAddress, ERC721_ABI, proposer);
    
    try {
        const nftOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
        console.log(`   Current NFT owner: ${nftOwner}`);
        
        if (nftOwner.toLowerCase() !== CONFIG.strategyAddress.toLowerCase()) {
            console.log("❌ NFT is not in strategy contract");
            console.log("💡 The NFT must be transferred to the strategy contract first");
            console.log("   Strategy address:", CONFIG.strategyAddress);
            console.log("   Current owner:", nftOwner);
            return;
        }
        console.log("✅ NFT is in strategy contract");
    } catch (error) {
        console.log("❌ Error checking NFT ownership:", error.message);
        console.log("💡 Make sure the NFT contract address and token ID are correct");
        return;
    }

    // Check for existing auction
    console.log("\n2. Checking for existing auction...");
    try {
        const auction = await strategy.auctions(CONFIG.nftTokenId);
        if (auction.active) {
            console.log("❌ NFT already has an active auction");
            console.log(`   Auction ID: ${auction.auctionId}`);
            console.log(`   Start Price: ${hre.ethers.formatEther(auction.startPrice)} ETH worth of tokens`);
            console.log(`   End Price: ${hre.ethers.formatEther(auction.endPrice)} ETH worth of tokens`);
            return;
        }
        console.log("✅ No active auction");
    } catch (error) {
        console.log("❌ Error checking auction status:", error.message);
        return;
    }

    // Check for pending proposals
    console.log("\n3. Checking for pending proposals...");
    try {
        const hasPending = await strategy.hasPendingProposal(CONFIG.nftTokenId);
        if (hasPending) {
            console.log("❌ NFT already has a pending proposal");
            return;
        }
        console.log("✅ No pending proposals");
    } catch (error) {
        console.log("❌ Error checking pending proposals:", error.message);
        return;
    }

    // Check minimum sell price
    console.log("\n4. Checking minimum sell price...");
    try {
        const minSellPrice = await strategy.minSellPrice();
        console.log(`   Minimum sell price: ${hre.ethers.formatEther(minSellPrice)} ETH worth of tokens`);
        
        if (CONFIG.endPrice < minSellPrice) {
            console.log("❌ End price is below minimum sell price");
            console.log(`   Your end price: ${hre.ethers.formatEther(CONFIG.endPrice)}`);
            console.log(`   Minimum required: ${hre.ethers.formatEther(minSellPrice)}`);
            return;
        }
        console.log("✅ End price meets minimum requirements");
    } catch (error) {
        console.log("❌ Error checking minimum sell price:", error.message);
        return;
    }

    // Propose auction
    console.log("\n5. Submitting community proposal...");
    try {
        const proposeTx = await strategy.connect(proposer).proposeAuction(
            CONFIG.nftTokenId,
            CONFIG.startPrice,
            CONFIG.endPrice
        );

        console.log("📡 Transaction submitted:", proposeTx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await proposeTx.wait();
        console.log("✅ Proposal submitted successfully!");
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
            console.log(`   Proposed At: ${new Date(Number(parsed.args.proposedAt) * 1000).toLocaleString()}`);
        }

        console.log("\n🎯 Community proposal submitted successfully!");
        console.log("💡 The strategy owner now needs to approve this proposal");
        console.log("💡 Run owneraccept.js to approve this proposal (if you're the owner)");
        console.log("💡 Or contact the strategy owner to review and approve the proposal");
        
    } catch (error) {
        console.log("❌ Error submitting proposal:", error.message);
        
        // Provide helpful error messages
        if (error.message.includes("NFTNotOwned")) {
            console.log("💡 The NFT is not owned by the strategy contract");
        } else if (error.message.includes("AuctionAlreadyActive")) {
            console.log("💡 There's already an active auction for this NFT");
        } else if (error.message.includes("ProposalAlreadyExists")) {
            console.log("💡 There's already a pending proposal for this NFT");
        } else if (error.message.includes("InvalidAuctionParams")) {
            console.log("💡 Invalid auction parameters - check start/end prices");
        }
    }
}

main().catch(console.error);
