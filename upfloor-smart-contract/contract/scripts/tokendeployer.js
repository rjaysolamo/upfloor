/**
 * Token Deployment Script
 * 
 * Deploys a new UpFloorToken, MintRouter, and Strategy using the Factory
 * 
 * Usage:
 *   npx hardhat run scripts/tokendeployer.js --network <network-name>
 * 
 * Configuration:
 *   Edit the CONFIG section below with your parameters
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

// ========================================
// CONFIGURATION - EDIT THESE VALUES
// ========================================
const CONFIG = {
    // Factory address (from factorydeployer.js output)
    factoryAddress: "0xB16EAa34cA11291a70Acfc16440F3aABAf89E332",
    
    // Token configuration
    tokenName: "XYZ Token",
    tokenSymbol: "XYZ",
    
    // NFT collection address
    nftCollectionAddress: "0x2132e53a520da3783135016c2d1c03cbb4576433",
    
    // Collection owner address (receives royalties)
    collectionOwnerAddress: "0xf41dBD4A1ee6f8f6CB8879f0568Ead8CA9D259b2",
    
    // Royalty percentage in basis points (700 = 7%, 1000 = 10%, etc.)
    royaltyBps: 700,
    
    // Deployment fee (will be checked against factory's required fee)
    deploymentFee: "0.00025", // ETH - adjust based on chain
};
// ========================================

async function main() {
    console.log("\n========================================");
    console.log("🪙 UpFloor Token Deployment via Factory");
    console.log("========================================\n");

    // Validate configuration
    if (CONFIG.factoryAddress === "0x...") {
        throw new Error("❌ Please set factoryAddress in CONFIG section");
    }
    if (CONFIG.nftCollectionAddress === "0x...") {
        throw new Error("❌ Please set nftCollectionAddress in CONFIG section");
    }
    if (CONFIG.collectionOwnerAddress === "0x...") {
        throw new Error("❌ Please set collectionOwnerAddress in CONFIG section");
    }

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    
    // Get balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
    console.log();

    // Display configuration
    console.log("📋 Configuration:");
    console.log("─────────────────────────────────────");
    console.log("Factory:", CONFIG.factoryAddress);
    console.log("Token Name:", CONFIG.tokenName);
    console.log("Token Symbol:", CONFIG.tokenSymbol);
    console.log("NFT Collection:", CONFIG.nftCollectionAddress);
    console.log("Collection Owner:", CONFIG.collectionOwnerAddress);
    console.log("Royalty BPS:", CONFIG.royaltyBps);
    console.log("Deployment Fee:", CONFIG.deploymentFee, "ETH");
    console.log();

    // Connect to factory
    console.log("🔗 Connecting to factory...");
    const factory = await hre.ethers.getContractAt("UpFloorStrategyFactory", CONFIG.factoryAddress);
    console.log("✅ Connected to factory");
    
    // Check required deployment fee
    const requiredFee = await factory.getDeploymentFee();
    const requiredFeeEth = hre.ethers.formatEther(requiredFee);
    console.log("💰 Required deployment fee:", requiredFeeEth, "ETH");
    
    // Validate deployment fee
    const deploymentFeeWei = hre.ethers.parseEther(CONFIG.deploymentFee);
    if (deploymentFeeWei < requiredFee) {
        throw new Error(`❌ Deployment fee too low. Required: ${requiredFeeEth} ETH, Provided: ${CONFIG.deploymentFee} ETH`);
    }
    console.log("✅ Deployment fee validation passed");
    console.log();

    // Deploy token via factory
    console.log("🚀 Deploying token system via factory...");
    console.log("⏳ This will deploy: Token + Router + Strategy");
    console.log();

    const tx = await factory.deployStrategyToken(
        CONFIG.tokenName,
        CONFIG.tokenSymbol,
        CONFIG.nftCollectionAddress,
        CONFIG.collectionOwnerAddress,
        CONFIG.royaltyBps,
        { value: deploymentFeeWei }
    );

    console.log("📡 Transaction submitted:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log();

    // Parse event to get deployed addresses
    const event = receipt.logs.find(log => {
        try {
            const parsed = factory.interface.parseLog(log);
            return parsed.name === "TokenDeployed";
        } catch {
            return false;
        }
    });

    if (!event) {
        throw new Error("TokenDeployed event not found in transaction logs");
    }

    const parsedEvent = factory.interface.parseLog(event);
    const tokenAddress = parsedEvent.args.token;
    const routerAddress = parsedEvent.args.router;
    const strategyAddress = parsedEvent.args.strategy;

    console.log("🎉 Deployment successful!");
    console.log("─────────────────────────────────────");
    console.log("📍 Token Address:", tokenAddress);
    console.log("📍 Router Address:", routerAddress);
    console.log("📍 Strategy Address:", strategyAddress);
    console.log();

    // Get token details
    const token = await hre.ethers.getContractAt("UpFloorToken", tokenAddress);
    const tokenOwner = await token.owner();
    const solverAddress = await token.solverAddress();
    const strategy = await token.strategy();

    console.log("📊 Token Details:");
    console.log("─────────────────────────────────────");
    console.log("Name:", await token.name());
    console.log("Symbol:", await token.symbol());
    console.log("Owner:", tokenOwner);
    console.log("Solver:", solverAddress);
    console.log("Strategy:", strategy);
    console.log("Collection:", await token.getCollectionAddress());
    console.log("Collection Owner:", await token.getCollectionOwnerAddress());
    console.log();

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        factoryAddress: CONFIG.factoryAddress,
        tokenAddress: tokenAddress,
        routerAddress: routerAddress,
        strategyAddress: strategyAddress,
        tokenName: CONFIG.tokenName,
        tokenSymbol: CONFIG.tokenSymbol,
        nftCollectionAddress: CONFIG.nftCollectionAddress,
        collectionOwnerAddress: CONFIG.collectionOwnerAddress,
        royaltyBps: CONFIG.royaltyBps,
        deploymentFee: CONFIG.deploymentFee,
        requiredDeploymentFee: requiredFeeEth,
        deployer: deployer.address,
        tokenOwner: tokenOwner,
        solverAddress: solverAddress,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date().toISOString()
    };

    console.log("📋 Full Deployment Info:");
    console.log("─────────────────────────────────────");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log();

    // Save to file
    const deploymentDir = path.join(__dirname, '../deploymentData');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const filename = `${hre.network.name}-${CONFIG.tokenSymbol.toLowerCase()}-deployment.json`;
    const filepath = path.join(deploymentDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", filepath);
    console.log();

    // Verification commands
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("🔍 To verify contracts on block explorer:");
        console.log("─────────────────────────────────────");
        console.log("\n# Verify Token:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${tokenAddress} "${CONFIG.tokenName}" "${CONFIG.tokenSymbol}" "${await token.getProtocolFeeRecipient()}" "${CONFIG.nftCollectionAddress}" "${CONFIG.collectionOwnerAddress}" "${CONFIG.royaltyBps}"`);
        console.log("\n# Verify Router:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${routerAddress} "${tokenAddress}"`);
        console.log("\n# Verify Strategy:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${strategyAddress} "${tokenAddress}" "${CONFIG.nftCollectionAddress}"`);
        console.log();
    }

    // Next steps
    console.log("📖 Next Steps:");
    console.log("─────────────────────────────────────");
    console.log("1. ✅ Token ownership transferred to:", tokenOwner);
    console.log("2. 🤖 Solver address is set to:", solverAddress);
    console.log("3. 🔗 Strategy is linked and ready");
    console.log("4. 💰 Users can mint tokens via Router:", routerAddress);
    console.log("5. 🎨 NFTs can be transferred to Strategy for auctions");
    console.log();

    console.log("========================================");
    console.log("✅ Token Deployment Complete!");
    console.log("========================================\n");

    return {
        token: tokenAddress,
        router: routerAddress,
        strategy: strategyAddress
    };
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });

module.exports = main;

