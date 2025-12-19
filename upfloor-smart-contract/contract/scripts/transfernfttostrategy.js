/**
 * Transfer NFT to Strategy Script
 * 
 * Transfers an NFT from solver to token contract, then to strategy contract
 */

const hre = require("hardhat");

const CONFIG = {
    tokenAddress: "0xc41670C04E162D3207Be18eef60C6341953B9B32",
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    nftCollectionAddress: "0x2132e53a520da3783135016c2d1c03cbb4576433",
    solverPrivateKey: "0xc9f18eb30619fcad3e2546ae07014007d9a426f5415c8d86353d4612995ff940",
    nftTokenId: 7, // Change this to the NFT you want to transfer
};

async function main() {
    console.log("🔄 Transferring NFT to Strategy\n");

    const solver = new hre.ethers.Wallet(CONFIG.solverPrivateKey, hre.ethers.provider);
    const token = await hre.ethers.getContractAt("UpFloorToken", CONFIG.tokenAddress);
    
    const ERC721_ABI = [
        "function ownerOf(uint256 tokenId) view returns (address)",
        "function safeTransferFrom(address from, address to, uint256 tokenId)"
    ];
    const nftCollection = new hre.ethers.Contract(CONFIG.nftCollectionAddress, ERC721_ABI, solver);

    console.log("👤 Solver:", solver.address);
    console.log("🎯 NFT ID:", CONFIG.nftTokenId);
    console.log();

    // Check current NFT owner
    console.log("1. Checking NFT ownership...");
    const currentOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
    console.log(`   Current owner: ${currentOwner}`);

    // Step 1: Transfer from solver to token contract
    if (currentOwner.toLowerCase() === solver.address.toLowerCase()) {
        console.log("\n2. Transferring NFT from solver to token contract...");
        const transferTx = await nftCollection.safeTransferFrom(
            solver.address,
            CONFIG.tokenAddress,
            CONFIG.nftTokenId
        );
        await transferTx.wait();
        console.log("✅ NFT transferred to token contract");
    } else {
        console.log("⚠️  NFT not owned by solver, skipping step 1");
    }

    // Step 2: Transfer from token to strategy using solver's executeExternalCall
    console.log("\n3. Transferring NFT from token to strategy...");
    const iface = new hre.ethers.Interface([
        "function safeTransferFrom(address from, address to, uint256 tokenId)"
    ]);
    
    const transferCalldata = iface.encodeFunctionData("safeTransferFrom", [
        CONFIG.tokenAddress,
        CONFIG.strategyAddress,
        CONFIG.nftTokenId
    ]);

    const executeTx = await token.connect(solver).executeExternalCall(
        CONFIG.nftCollectionAddress,
        0,
        transferCalldata
    );
    await executeTx.wait();
    console.log("✅ NFT transferred to strategy contract");

    // Verify final ownership
    console.log("\n4. Verifying transfer...");
    const finalOwner = await nftCollection.ownerOf(CONFIG.nftTokenId);
    console.log(`   Final owner: ${finalOwner}`);
    console.log(`   Strategy address: ${CONFIG.strategyAddress}`);
    console.log(`   Transfer successful: ${finalOwner.toLowerCase() === CONFIG.strategyAddress.toLowerCase() ? "✅" : "❌"}`);

    console.log("\n🎯 NFT is now in strategy contract and ready for auction!");
}

main().catch(console.error);
