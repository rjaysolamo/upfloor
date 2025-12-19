/**
 * Factory Deployment Script
 * 
 * Deploys the UpFloorStrategyFactory contract
 * 
 * Usage:
 *   npx hardhat run scripts/factorydeployer.js --network <network-name>
 */

const hre = require("hardhat");

async function main() {
    console.log("\n========================================");
    console.log("🏭 UpFloor Strategy Factory Deployment");
    console.log("========================================\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    
    // Get balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
    console.log();

    // Deploy Factory
    console.log("🚀 Deploying UpFloorStrategyFactory...");
    const UpFloorStrategyFactory = await hre.ethers.getContractFactory("UpFloorStrategyFactory");
    
    let factory, factoryAddress;
    
    // For HyperEVM, we need to use big blocks for large contracts
    if (hre.network.name === "hyperevm") {
        console.log("🌐 HyperEVM detected - configuring for big blocks deployment");
        
        // Check if we're already using big blocks
        const usingBigBlocks = await hre.ethers.provider.send("eth_usingBigBlocks", [deployer.address]);
        console.log("📊 Currently using big blocks:", usingBigBlocks);
        
        if (!usingBigBlocks) {
            console.log("⚠️  Big blocks not enabled for this address");
            console.log("💡 You need to enable big blocks for your address first");
            console.log("🔗 Visit: https://app.hyperliquid.xyz/portfolio");
            console.log("📋 Go to Settings > Advanced > Enable Big Blocks");
            throw new Error("Big blocks not enabled for deployment address");
        }
        
        // Get big block gas price
        const bigBlockGasPrice = await hre.ethers.provider.send("eth_bigBlockGasPrice", []);
        console.log("💰 Big block gas price:", bigBlockGasPrice);
        
        // Estimate gas for deployment
        const gasEstimate = await UpFloorStrategyFactory.getDeployTransaction().then(tx => 
            hre.ethers.provider.estimateGas(tx)
        );
        console.log("📊 Estimated gas:", gasEstimate.toString());
        
        // Deploy with big block configuration
        factory = await UpFloorStrategyFactory.deploy({
            gasPrice: bigBlockGasPrice,
            gasLimit: gasEstimate * 120n / 100n // 20% buffer
        });
        await factory.waitForDeployment();
        
        factoryAddress = await factory.getAddress();
        console.log("✅ Factory deployed to:", factoryAddress);
        console.log();
    } else {
        // Standard deployment for other networks
        factory = await UpFloorStrategyFactory.deploy();
        await factory.waitForDeployment();
        
        factoryAddress = await factory.getAddress();
        console.log("✅ Factory deployed to:", factoryAddress);
        console.log();
    }

    // Get factory instance for additional info
    const factoryContract = await hre.ethers.getContractAt("UpFloorStrategyFactory", factoryAddress);
    
    // Get factory owner
    const factoryOwner = await factoryContract.owner();
    console.log("👤 Factory owner:", factoryOwner);
    console.log("📍 Protocol fee recipient:", await factoryContract.PROTOCOL_FEE_RECIPIENT());
    console.log();

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        factoryAddress: factoryAddress,
        deployer: deployer.address,
        factoryOwner: factoryOwner,
        timestamp: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber()
    };

    console.log("📋 Deployment Summary:");
    console.log("─────────────────────────────────────");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log();

    // Save to file
    const fs = require('fs');
    const path = require('path');
    const deploymentDir = path.join(__dirname, '../deploymentData');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const filename = `${hre.network.name}-factory-deployment.json`;
    const filepath = path.join(deploymentDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", filepath);
    console.log();

    // Verification info
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("🔍 To verify on block explorer, run:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${factoryAddress}`);
        console.log();
    }

    console.log("========================================");
    console.log("✅ Factory Deployment Complete!");
    console.log("========================================\n");

    return {
        factory: factoryAddress,
        deployer: deployer.address
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

