/**
 * Factory Deployer Script
 * 
 * Deploys the UpFloorStrategyFactory contract
 * 
 * Usage:
 *   npx hardhat run scripts/factoryDeployer.js --network <network-name>
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

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

    // Get network info
    const network = await hre.ethers.provider.getNetwork();
    console.log("🌐 Network:", hre.network.name);
    console.log("🔗 Chain ID:", network.chainId.toString());
    console.log();

    // Deploy Factory
    console.log("🚀 Deploying UpFloorStrategyFactory...");
    const UpFloorStrategyFactory = await hre.ethers.getContractFactory("UpFloorStrategyFactory");
    const factory = await UpFloorStrategyFactory.deploy();
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log("✅ Factory deployed to:", factoryAddress);
    console.log();

    // Get factory details
    const factoryOwner = await factory.owner();
    const deploymentFee = await factory.getDeploymentFee();
    const protocolFeeRecipient = await factory.PROTOCOL_FEE_RECIPIENT();

    console.log("📊 Factory Details:");
    console.log("─────────────────────────────────────");
    console.log("Owner:", factoryOwner);
    console.log("Protocol Fee Recipient:", protocolFeeRecipient);
    console.log("Deployment Fee:", hre.ethers.formatEther(deploymentFee), "ETH");
    console.log();

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        chainId: network.chainId.toString(),
        factoryAddress: factoryAddress,
        deployer: deployer.address,
        factoryOwner: factoryOwner,
        protocolFeeRecipient: protocolFeeRecipient,
        deploymentFee: hre.ethers.formatEther(deploymentFee),
        timestamp: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber()
    };

    console.log("📋 Deployment Summary:");
    console.log("─────────────────────────────────────");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log();

    // Save to file
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

    // Verification command
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("🔍 To verify contract on block explorer:");
        console.log("─────────────────────────────────────");
        console.log(`npx hardhat verify --network ${hre.network.name} ${factoryAddress}`);
        console.log();
    }

    console.log("========================================");
    console.log("✅ Factory Deployment Complete!");
    console.log("========================================\n");

    return {
        factory: factoryAddress,
        owner: factoryOwner,
        deploymentFee: hre.ethers.formatEther(deploymentFee)
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
