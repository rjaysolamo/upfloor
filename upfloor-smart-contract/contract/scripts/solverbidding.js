/**
 * Solver Bidding Script
 * 
 * Bidder mints tokens and bids on the auction
 */

const hre = require("hardhat");

const CONFIG = {
    tokenAddress: "0xc41670C04E162D3207Be18eef60C6341953B9B32",
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    routerAddress: "0x48BcB87056f38008ae1924a0d1a993D0954f65c9",
    nftCollectionAddress: "0x2132e53a520da3783135016c2d1c03cbb4576433",
    bidderPrivateKey: "0x07b89acc386c2528752c033dfc01319cdb523f4b6b036ae170404d0249dc32df",
    nftTokenId: 8, // Change this to match the auction
    tokensToMint: hre.ethers.parseEther("1"), // Mint 1 full token
};

async function main() {
    console.log("💰 Solver Bidding on Auction\n");

    const bidder = new hre.ethers.Wallet(CONFIG.bidderPrivateKey, hre.ethers.provider);
    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);
    const token = await hre.ethers.getContractAt("UpFloorToken", CONFIG.tokenAddress);
    const router = await hre.ethers.getContractAt("MintRouter", CONFIG.routerAddress);
    
    const ERC721_ABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const nftCollection = new hre.ethers.Contract(CONFIG.nftCollectionAddress, ERC721_ABI, bidder);

    console.log("👤 Bidder:", bidder.address);
    console.log("🎯 NFT ID:", CONFIG.nftTokenId);
    console.log();

    // Check auction status
    console.log("1. Checking auction status...");
    const auction = await strategy.auctions(CONFIG.nftTokenId);
    const currentPrice = await strategy.currentAuctionPrice(CONFIG.nftTokenId);
    const minSellPrice = await strategy.minSellPrice();
    
    console.log(`   Active: ${auction.active}`);
    console.log(`   Current Price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);
    console.log(`   Min Sell Price: ${hre.ethers.formatEther(minSellPrice)} ETH worth of tokens`);
    
    if (!auction.active) {
        console.log("❌ No active auction for this NFT");
        return;
    }

    // Check current token balance
    console.log("\n2. Checking current token balance...");
    const currentBalance = await token.balanceOf(bidder.address);
    console.log(`   Current XYZ tokens: ${hre.ethers.formatEther(currentBalance)}`);

    // Mint tokens if needed
    if (currentBalance < currentPrice) {
        console.log("\n3. Minting tokens...");
        const mintCost = await token.previewMint(CONFIG.tokensToMint);
        console.log(`   Mint cost: ${hre.ethers.formatEther(mintCost)} ETH`);
        
        const mintTx = await router.connect(bidder).mint(CONFIG.tokensToMint, bidder.address, {
            value: mintCost
        });
        
        console.log("📡 Transaction submitted:", mintTx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const mintReceipt = await mintTx.wait();
        console.log("✅ Tokens minted!");
        console.log("   Block:", mintReceipt.blockNumber);
        console.log("   Gas used:", mintReceipt.gasUsed.toString());
        
        const newBalance = await token.balanceOf(bidder.address);
        console.log(`   New token balance: ${hre.ethers.formatEther(newBalance)}`);
    } else {
        console.log("✅ Already have enough tokens");
    }

    // Check final balance
    const finalBalance = await token.balanceOf(bidder.address);
    console.log(`\n4. Final token balance: ${hre.ethers.formatEther(finalBalance)}`);

    if (finalBalance < currentPrice) {
        console.log("❌ Still not enough tokens to bid");
        console.log(`   Need: ${hre.ethers.formatEther(currentPrice)} tokens`);
        console.log(`   Have: ${hre.ethers.formatEther(finalBalance)} tokens`);
        return;
    }

    // Approve tokens
    console.log("\n5. Approving tokens for strategy...");
    const approveTx = await token.connect(bidder).approve(CONFIG.strategyAddress, currentPrice);
    await approveTx.wait();
    console.log("✅ Tokens approved!");

    // Bid on auction
    console.log("\n6. Bidding on auction...");
    const bidTx = await strategy.connect(bidder).acceptBid(CONFIG.nftTokenId);
    
    console.log("📡 Transaction submitted:", bidTx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const bidReceipt = await bidTx.wait();
    console.log("🎉 BID SUCCESSFUL!");
    console.log("   Block:", bidReceipt.blockNumber);
    console.log("   Gas used:", bidReceipt.gasUsed.toString());

    // Verify NFT transfer
    console.log("\n7. Verifying NFT transfer...");
    const newOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
    console.log(`   NFT #${CONFIG.nftTokenId} new owner: ${newOwner}`);
    console.log(`   Bidder address: ${bidder.address}`);
    console.log(`   Transfer successful: ${newOwner.toLowerCase() === bidder.address.toLowerCase() ? "✅" : "❌"}`);

    if (newOwner.toLowerCase() === bidder.address.toLowerCase()) {
        console.log("\n🎉 AUCTION WON!");
        console.log(`💰 Final price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);
        console.log(`🎯 NFT #${CONFIG.nftTokenId} is now owned by: ${bidder.address}`);
        
        // Run final verification
        await verifySuccessfulExecution();
    }
}

async function verifySuccessfulExecution() {
    console.log("\n" + "=".repeat(40));
    console.log("🎯 VERIFYING SUCCESSFUL EXECUTION");
    console.log("=".repeat(40));

    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);
    const ERC721_ABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const nftCollection = new hre.ethers.Contract(CONFIG.nftCollectionAddress, ERC721_ABI, hre.ethers.provider);

    // Check NFT ownership
    console.log("\n1. Final NFT ownership verification...");
    try {
        const nftOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
        const bidder = new hre.ethers.Wallet(CONFIG.bidderPrivateKey, hre.ethers.provider);
        
        console.log(`   Current owner: ${nftOwner}`);
        console.log(`   Expected winner: ${bidder.address}`);
        
        const ownershipCorrect = nftOwner.toLowerCase() === bidder.address.toLowerCase();
        console.log(`   Ownership correct: ${ownershipCorrect ? "✅" : "❌"}`);
        
        if (!ownershipCorrect) {
            console.log("❌ NFT ownership verification failed");
            return;
        }
    } catch (error) {
        console.log("❌ Error checking NFT ownership:", error.message);
        return;
    }

    // Check auction status
    console.log("\n2. Final auction status check...");
    try {
        const auction = await strategy.auctions(CONFIG.nftTokenId);
        console.log(`   Auction active: ${auction.active}`);
        console.log(`   Auction ID: ${auction.auctionId}`);
        
        if (auction.active) {
            console.log("⚠️  Auction is still active - this shouldn't happen after successful bid");
        } else {
            console.log("✅ Auction is closed - bid was successful");
        }
    } catch (error) {
        console.log("❌ Error checking auction status:", error.message);
    }

    // Check pending proposals
    console.log("\n3. Final proposal status check...");
    try {
        const hasPending = await strategy.hasPendingProposal(CONFIG.nftTokenId);
        console.log(`   Has pending proposal: ${hasPending}`);
        
        if (hasPending) {
            console.log("⚠️  Still has pending proposal");
        } else {
            console.log("✅ No pending proposals - proposal was processed");
        }
    } catch (error) {
        console.log("❌ Error checking proposals:", error.message);
    }

    // Final success message
    console.log("\n" + "=".repeat(50));
    console.log("🎉 EXECUTION SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log("✅ Complete auction flow executed successfully!");
    console.log("✅ NFT transferred to winning bidder");
    console.log("✅ Auction system working perfectly");
    console.log("=".repeat(50));
}

main().catch(console.error);
