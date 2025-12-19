/**
 * Owner Transfer NFT Script
 * 
 * Owner transfers NFT to strategy contract for auction
 */

const hre = require("hardhat");

const CONFIG = {
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    ownerPrivateKey: "0xc6167b8017f0c8c97fe4cfda7eb471c48e0f4eede558fccc3a50c596f56986f6",
    nftTokenId: 8, // Change this to the NFT you want to transfer
};

async function main() {
    console.log("👑 Owner Transferring NFT to Strategy\n");

    const owner = new hre.ethers.Wallet(CONFIG.ownerPrivateKey, hre.ethers.provider);
    const ERC721_ABI = [
        "function ownerOf(uint256 tokenId) view returns (address)",
        "function safeTransferFrom(address from, address to, uint256 tokenId)"
    ];
    const nftCollection = new hre.ethers.Contract("0x2132e53a520da3783135016c2d1c03cbb4576433", ERC721_ABI, owner);

    console.log("👤 Owner:", owner.address);
    console.log("🎯 NFT ID:", CONFIG.nftTokenId);
    console.log();

    // Check current NFT owner
    console.log("1. Checking NFT ownership...");
    const currentOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
    console.log(`   Current owner: ${currentOwner}`);

    if (currentOwner.toLowerCase() !== owner.address.toLowerCase()) {
        console.log("❌ NFT not owned by owner");
        console.log("💡 Owner needs to own the NFT to transfer it");
        return;
    }

    // Transfer NFT to strategy
    console.log("\n2. Transferring NFT to strategy...");
    const transferTx = await nftCollection.safeTransferFrom(
        owner.address,
        CONFIG.strategyAddress,
        CONFIG.nftTokenId
    );

    console.log("📡 Transaction submitted:", transferTx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await transferTx.wait();
    console.log("✅ NFT transferred to strategy!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

    // Verify transfer
    console.log("\n3. Verifying transfer...");
    const finalOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
    console.log(`   Final owner: ${finalOwner}`);
    console.log(`   Strategy address: ${CONFIG.strategyAddress}`);
    console.log(`   Transfer successful: ${finalOwner.toLowerCase() === CONFIG.strategyAddress.toLowerCase() ? "✅" : "❌"}`);

    if (finalOwner.toLowerCase() === CONFIG.strategyAddress.toLowerCase()) {
        console.log("\n🎯 NFT is now in strategy contract and ready for auction!");
        console.log("💡 Run ownerdirectauction.js to create an auction");
    }
}

main().catch(console.error);
