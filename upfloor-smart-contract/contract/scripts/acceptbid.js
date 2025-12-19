/**
 * Accept Bid Script
 * 
 * Bidder accepts a bid on an active auction
 */

const hre = require("hardhat");

const CONFIG = {
    tokenAddress: "0xc41670C04E162D3207Be18eef60C6341953B9B32",
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    routerAddress: "0x48BcB87056f38008ae1924a0d1a993D0954f65c9",
    nftCollectionAddress: "0x2132e53a520da3783135016c2d1c03cbb4576433",
    bidderPrivateKey: "",
    nftTokenId: null, // Will be auto-detected or set manually
    tokensToMint: hre.ethers.parseEther("1"), // Mint 1 full token if needed
};

async function main() {
    console.log("💰 Accept Bid Script\n");

    const bidder = new hre.ethers.Wallet(CONFIG.bidderPrivateKey, hre.ethers.provider);
    const strategy = await hre.ethers.getContractAt("UpFloorStrategy", CONFIG.strategyAddress);
    const token = await hre.ethers.getContractAt("UpFloorToken", CONFIG.tokenAddress);
    const router = await hre.ethers.getContractAt("MintRouter", CONFIG.routerAddress);
    
    const ERC721_ABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const nftCollection = new hre.ethers.Contract(CONFIG.nftCollectionAddress, ERC721_ABI, bidder);

    console.log("👤 Bidder:", bidder.address);
    console.log();

    // Get active auctions
    console.log("1. Checking active auctions...");
    const activeTokenIds = await strategy.getActiveTokenIds();
    const activeCount = await strategy.getActiveAuctionCount();
    
    console.log(`   Active Auctions: ${activeCount}`);
    
    if (activeCount === 0) {
        console.log("❌ No active auctions to bid on");
        console.log("💡 Create an auction using ownerdirectauction.js or listproposal.js");
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
            const minSellPrice = await strategy.minSellPrice();
            
            const priceEth = hre.ethers.formatEther(currentPrice);
            const status = currentPrice <= minSellPrice ? "🎯 Ready" : "⏳ Decaying";
            
            console.log(`${tokenId.toString().padStart(8)} | ${priceEth.padStart(18)} | ${status}`);
        } catch (error) {
            console.log(`${tokenId.toString().padStart(8)} | Error: ${error.message}`);
        }
    }

    // Determine which auction to bid on
    let tokenIdToBid = CONFIG.nftTokenId;
    
    if (!tokenIdToBid) {
        // Use the first active auction
        tokenIdToBid = activeTokenIds[0];
        console.log(`\n3. Auto-selecting first active auction: Token ID ${tokenIdToBid}`);
    } else {
        console.log(`\n3. Using specified Token ID: ${tokenIdToBid}`);
    }

    // Check auction status
    console.log("\n4. Checking auction status...");
    const auction = await strategy.auctions(tokenIdToBid);
    const currentPrice = await strategy.currentAuctionPrice(tokenIdToBid);
    const minSellPrice = await strategy.minSellPrice();
    
    console.log(`   Active: ${auction.active}`);
    console.log(`   Current Price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);
    console.log(`   Min Sell Price: ${hre.ethers.formatEther(minSellPrice)} ETH worth of tokens`);
    
    if (!auction.active) {
        console.log("❌ Auction is not active");
        return;
    }

    // Check if auction has expired
    const timeElapsed = Math.floor(Date.now() / 1000) - Number(auction.startTime);
    const maxDuration = await strategy.maxAuctionDuration();
    
    if (timeElapsed > Number(maxDuration)) {
        console.log("❌ Auction has expired");
        return;
    }

    // Check current token balance
    console.log("\n5. Checking current token balance...");
    const currentBalance = await token.balanceOf(bidder.address);
    console.log(`   Current XYZ tokens: ${hre.ethers.formatEther(currentBalance)}`);

    // Mint tokens if needed
    if (currentBalance < currentPrice) {
        console.log("\n6. Minting additional tokens...");
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
    console.log(`\n7. Final token balance: ${hre.ethers.formatEther(finalBalance)}`);

    if (finalBalance < currentPrice) {
        console.log("❌ Still not enough tokens to bid");
        console.log(`   Need: ${hre.ethers.formatEther(currentPrice)} tokens`);
        console.log(`   Have: ${hre.ethers.formatEther(finalBalance)} tokens`);
        return;
    }

    // Approve tokens for strategy
    console.log("\n8. Approving tokens for strategy...");
    const approveTx = await token.connect(bidder).approve(CONFIG.strategyAddress, currentPrice);
    await approveTx.wait();
    console.log("✅ Tokens approved!");

    // Accept the bid
    console.log("\n9. Accepting bid on auction...");
    const bidTx = await strategy.connect(bidder).acceptBid(tokenIdToBid);
    
    console.log("📡 Transaction submitted:", bidTx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const bidReceipt = await bidTx.wait();
    console.log("🎉 BID ACCEPTED!");
    console.log("   Block:", bidReceipt.blockNumber);
    console.log("   Gas used:", bidReceipt.gasUsed.toString());

    // Verify NFT transfer
    console.log("\n10. Verifying NFT transfer...");
    const newOwner = await nftCollection.ownerOf(tokenIdToBid);
    console.log(`   NFT #${tokenIdToBid} new owner: ${newOwner}`);
    console.log(`   Bidder address: ${bidder.address}`);
    console.log(`   Transfer successful: ${newOwner.toLowerCase() === bidder.address.toLowerCase() ? "✅" : "❌"}`);

    if (newOwner.toLowerCase() === bidder.address.toLowerCase()) {
        console.log("\n🎉 AUCTION WON!");
        console.log(`💰 Final price: ${hre.ethers.formatEther(currentPrice)} ETH worth of tokens`);
        console.log(`🎯 NFT #${tokenIdToBid} is now owned by: ${bidder.address}`);
        
        // Check auction status after bid
        const finalAuction = await strategy.auctions(tokenIdToBid);
        console.log(`   Auction now active: ${finalAuction.active}`);
    }

    // Show remaining active auctions
    console.log("\n11. Remaining active auctions...");
    const remainingActive = await strategy.getActiveTokenIds();
    console.log(`   Remaining Active Auctions: ${remainingActive.length}`);
    
    if (remainingActive.length > 0) {
        console.log(`   Remaining Token IDs: [${remainingActive.join(", ")}]`);
    }

    console.log("\n🎉 Bid acceptance completed!");
}

main().catch(console.error);
