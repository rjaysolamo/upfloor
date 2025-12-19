/**
 * Solver Transfer Test Script
 * 
 * Tests the solver's ability to transfer NFTs from UpFloorToken to Strategy
 * 
 * Usage:
 *   npx hardhat run scripts/solvertransfertest.js --network apechain
 */

const hre = require("hardhat");

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    // Deployed contract addresses (from latest deployment)
    tokenAddress: "0xc41670C04E162D3207Be18eef60C6341953B9B32",
    strategyAddress: "0x6006e62c5557c6c79a9dDdEAadc6e361567d8CDa",
    nftCollectionAddress: "0x2132e53a520da3783135016c2d1c03cbb4576433",
    
    // Solver private key
    solverPrivateKey: "0xc9f18eb30619fcad3e2546ae07014007d9a426f5415c8d86353d4612995ff940",
    
    // NFT token ID to transfer (will be auto-detected)
    nftTokenId: null, // ← Will be auto-detected from available NFTs
    
    // Set to true to first transfer NFT from solver to token, then to strategy
    // Set to false to only transfer from token to strategy (if NFT already in token)
    transferFromSolver: true,
};
// ========================================

async function main() {
    console.log("\n========================================");
    console.log("🤖 Solver NFT Transfer Test");
    console.log("========================================\n");

    // Create solver wallet from private key
    const solver = new hre.ethers.Wallet(CONFIG.solverPrivateKey, hre.ethers.provider);
    console.log("🤖 Solver address:", solver.address);
    
    const balance = await hre.ethers.provider.getBalance(solver.address);
    console.log("💰 Solver balance:", hre.ethers.formatEther(balance), "ETH");
    console.log();

    // Connect to contracts
    console.log("🔗 Connecting to contracts...");
    const token = await hre.ethers.getContractAt("UpFloorToken", CONFIG.tokenAddress);
    
    // Use a simple ERC721 interface to avoid ambiguity
    const ERC721_ABI = [
        "function ownerOf(uint256 tokenId) view returns (address)",
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
        "function balanceOf(address owner) view returns (uint256)",
        "function tokenByIndex(uint256 index) view returns (uint256)",
        "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)"
    ];
    const nftCollection = new hre.ethers.Contract(CONFIG.nftCollectionAddress, ERC721_ABI, solver);
    
    console.log("✅ Connected to Token:", CONFIG.tokenAddress);
    console.log("✅ Connected to NFT Collection:", CONFIG.nftCollectionAddress);
    console.log();

    // Verify solver address
    const configuredSolver = await token.solverAddress();
    console.log("📋 Configuration Check:");
    console.log("   Expected solver:", solver.address);
    console.log("   Configured solver:", configuredSolver);
    console.log("   Match:", solver.address.toLowerCase() === configuredSolver.toLowerCase() ? "✅" : "❌");
    console.log();

    if (solver.address.toLowerCase() !== configuredSolver.toLowerCase()) {
        throw new Error("Solver address mismatch! Update solver address in contract first.");
    }

    // Find available NFTs in the token contract
    console.log("🔍 Finding available NFTs in token contract...");
    let availableNFTs = [];
    let nftTokenId = CONFIG.nftTokenId;
    
    try {
        // Check token balance
        const tokenBalance = await nftCollection.balanceOf(CONFIG.tokenAddress);
        console.log(`   Token contract balance: ${tokenBalance} NFTs`);
        
        if (tokenBalance > 0) {
            // Try to find NFTs owned by token contract by checking common token IDs
            console.log("   Scanning for NFTs owned by token contract...");
            
            // Check token IDs 1-20 (adjust range as needed)
            for (let i = 1; i <= 20; i++) {
                try {
                    const owner = await nftCollection.ownerOf(i);
                    if (owner.toLowerCase() === CONFIG.tokenAddress.toLowerCase()) {
                        availableNFTs.push(i);
                        console.log(`   ✅ Found NFT #${i} owned by token contract`);
                    }
                } catch (error) {
                    // NFT doesn't exist or error checking
                    continue;
                }
            }
            
            if (availableNFTs.length > 0) {
                nftTokenId = availableNFTs[0]; // Use first available NFT
                console.log(`   🎯 Using NFT #${nftTokenId} for transfer`);
            } else {
                console.log("   ⚠️  No NFTs found in token contract (checked IDs 1-20)");
                console.log("   💡 Please transfer an NFT to the token contract first");
                return;
            }
        } else {
            console.log("   ⚠️  Token contract has no NFTs");
            console.log("   💡 Please transfer an NFT to the token contract first");
            return;
        }
        
        console.log(`   Solver address:`, solver.address);
        console.log(`   Token contract:`, CONFIG.tokenAddress);
        console.log(`   Strategy contract:`, CONFIG.strategyAddress);
        console.log();
        
    } catch (error) {
        console.error(`❌ Error finding NFTs in token contract`);
        console.error(error.message);
        throw error;
    }

    // Step 1: Transfer NFT from solver to token contract (if needed)
    if (CONFIG.transferFromSolver && nftTokenId && availableNFTs.length === 0) {
        console.log("📦 STEP 1: Transfer NFT from Solver to Token Contract");
        console.log("─────────────────────────────────────");
        console.log(`   From: ${solver.address} (Solver)`);
        console.log(`   To: ${CONFIG.tokenAddress} (Token)`);
        console.log(`   NFT ID: ${nftTokenId}`);
        console.log();

        try {
            console.log("📡 Submitting transfer transaction...");
            const transferTx = await nftCollection.safeTransferFrom(
                solver.address,
                CONFIG.tokenAddress,
                nftTokenId
            );

            console.log("   Tx hash:", transferTx.hash);
            console.log("⏳ Waiting for confirmation...");
            
            const transferReceipt = await transferTx.wait();
            console.log("✅ Transfer confirmed!");
            console.log("   Block:", transferReceipt.blockNumber);
            console.log("   Gas used:", transferReceipt.gasUsed.toString());
            console.log();

            // Verify transfer
            const nftOwner = await nftCollection.ownerOf(nftTokenId);
            console.log("🔍 Verification:");
            console.log(`   NFT #${nftTokenId} new owner:`, nftOwner);
            console.log(`   Expected (Token):`, CONFIG.tokenAddress);
            console.log(`   Match:`, nftOwner.toLowerCase() === CONFIG.tokenAddress.toLowerCase() ? "✅" : "❌");
            console.log();

            if (nftOwner.toLowerCase() !== CONFIG.tokenAddress.toLowerCase()) {
                throw new Error("NFT transfer to token contract failed");
            }

        } catch (error) {
            console.error("\n❌ Failed to transfer NFT to token contract:");
            console.error(error.message);
            throw error;
        }
    } else {
        console.log("✅ NFT already owned by token contract, skipping Step 1");
        console.log();
    }

    // Step 2: Transfer NFT from token contract to strategy contract
    console.log("📦 STEP 2: Transfer NFT from Token to Strategy Contract");
    console.log("─────────────────────────────────────");
    console.log(`   From: ${CONFIG.tokenAddress} (Token)`);
    console.log(`   To: ${CONFIG.strategyAddress} (Strategy)`);
    console.log(`   NFT ID: ${nftTokenId}`);
    console.log();

    // Encode the transfer call
    console.log("📝 Encoding NFT transfer...");
    console.log();

    // Create the safeTransferFrom calldata
    const iface = new hre.ethers.Interface([
        "function safeTransferFrom(address from, address to, uint256 tokenId)"
    ]);
    
    const transferCalldata = iface.encodeFunctionData("safeTransferFrom", [
        CONFIG.tokenAddress,      // from (token owns it)
        CONFIG.strategyAddress,   // to (strategy will own it)
        nftTokenId                // tokenId
    ]);

    console.log("📦 Transfer calldata:", transferCalldata);
    console.log();

    // Execute the transfer via executeExternalCall
    console.log("🚀 Executing transfer via solver...");
    console.log("   Calling: token.executeExternalCall()");
    console.log("   Target: NFT Collection");
    console.log("   Value: 0 ETH");
    console.log();

    try {
        // Estimate gas first
        console.log("⛽ Estimating gas...");
        const gasEstimate = await token.connect(solver).executeExternalCall.estimateGas(
            CONFIG.nftCollectionAddress,
            0,
            transferCalldata
        );
        console.log("   Gas estimate:", gasEstimate.toString());
        console.log();

        // Execute the transaction
        console.log("📡 Submitting transaction...");
        const tx = await token.connect(solver).executeExternalCall(
            CONFIG.nftCollectionAddress,
            0,
            transferCalldata
        );

        console.log("   Tx hash:", tx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");
        console.log("   Block:", receipt.blockNumber);
        console.log("   Gas used:", receipt.gasUsed.toString());
        console.log();

        // Verify transfer
        console.log("🔍 Verifying transfer...");
        const newOwner = await nftCollection.ownerOf(nftTokenId);
        console.log(`   NFT #${nftTokenId} new owner:`, newOwner);
        console.log(`   Strategy address:`, CONFIG.strategyAddress);
        console.log(`   Transfer successful:`, newOwner.toLowerCase() === CONFIG.strategyAddress.toLowerCase() ? "✅" : "❌");
        console.log();

        if (newOwner.toLowerCase() === CONFIG.strategyAddress.toLowerCase()) {
            console.log("========================================");
            console.log("✅ TRANSFER SUCCESSFUL!");
            console.log("========================================");
            console.log(`NFT #${nftTokenId} is now owned by Strategy`);
            console.log("Ready to propose auction! 🎯");
            console.log();
        } else {
            console.log("❌ Transfer failed - NFT owner did not change");
        }

    } catch (error) {
        console.error("\n❌ Transfer failed:");
        console.error(error.message);
        
        if (error.message.includes("Not authorized")) {
            console.error("\n💡 The solver address is not authorized.");
            console.error("   Make sure the solver private key matches the configured solver address.");
        } else if (error.message.includes("Invalid target")) {
            console.error("\n💡 The NFT collection address is not whitelisted.");
            console.error("   Check that collectionAddress matches in the token contract.");
        }
        
        throw error;
    }

    console.log("\n========================================");
    console.log("📊 Test Summary");
    console.log("========================================");
    console.log("Solver:", solver.address);
    console.log("Token:", CONFIG.tokenAddress);
    console.log("Strategy:", CONFIG.strategyAddress);
    console.log("NFT Collection:", CONFIG.nftCollectionAddress);
    console.log("NFT Token ID:", nftTokenId);
    console.log();
    console.log("✅ Complete Flow:");
    if (CONFIG.transferFromSolver) {
        console.log("   1. Solver → Token: ✅");
    }
    console.log("   2. Token → Strategy: ✅");
    console.log();
    console.log("🎯 NFT is now in Strategy and ready for auction!");
    console.log("========================================\n");
}

// Execute the test
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test failed:");
        console.error(error);
        process.exit(1);
    });

module.exports = main;

