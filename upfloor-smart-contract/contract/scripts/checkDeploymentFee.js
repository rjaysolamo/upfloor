/**
 * Check Deployment Fee Script
 * 
 * Checks the current deployment fee for the UpFloorStrategyFactory
 * 
 * Usage:
 *   npx hardhat run scripts/checkDeploymentFee.js --network <network-name>
 */

const hre = require("hardhat");

// ========================================
// CONFIGURATION - EDIT THESE VALUES
// ========================================
const CONFIG = {
    // Factory address (from factorydeployer.js output)
    factoryAddress: "0xE8E1CcA455F59b1C9351d503B4a81E9D38324884",
};
// ========================================

async function main() {
    console.log("\n========================================");
    console.log("💰 UpFloor Factory Deployment Fee Check");
    console.log("========================================\n");

    // Get network info
    const network = hre.network.name;
    const chainId = await hre.ethers.provider.getNetwork().then(n => n.chainId);
    
    console.log("🌐 Network:", network);
    console.log("🔗 Chain ID:", chainId.toString());
    console.log();

    // Connect to factory
    console.log("🔗 Connecting to factory...");
    const factory = await hre.ethers.getContractAt("UpFloorStrategyFactory", CONFIG.factoryAddress);
    console.log("✅ Connected to factory");
    console.log();

    // Get deployment fee
    const deploymentFee = await factory.getDeploymentFee();
    const deploymentFeeEth = hre.ethers.formatEther(deploymentFee);
    
    console.log("💰 Current Deployment Fee:");
    console.log("─────────────────────────────────────");
    console.log("Wei:", deploymentFee.toString());
    console.log("ETH:", deploymentFeeEth);
    console.log();

    // Show expected fees for different chains
    console.log("📋 Expected Fees by Chain:");
    console.log("─────────────────────────────────────");
    console.log("ApeChain (33139):", "0.002 ETH");
    console.log("Ethereum (1):", "0.00025 ETH");
    console.log("HyperEVM (999):", "0.000015 ETH");
    console.log("Other chains:", "0.00025 ETH (default)");
    console.log();

    // Check if current fee matches expected
    const expectedFees = {
        33139: "0.002",
        1: "0.00025", 
        999: "0.000015"
    };
    
    const expectedFee = expectedFees[chainId] || "0.00025";
    const expectedFeeWei = hre.ethers.parseEther(expectedFee);
    
    if (deploymentFee.eq(expectedFeeWei)) {
        console.log("✅ Deployment fee matches expected value for this chain");
    } else {
        console.log("⚠️  Deployment fee differs from expected value");
        console.log("Expected:", expectedFee, "ETH");
        console.log("Actual:", deploymentFeeEth, "ETH");
    }
    console.log();

    console.log("========================================");
    console.log("✅ Deployment Fee Check Complete!");
    console.log("========================================\n");

    return {
        chainId: chainId.toString(),
        deploymentFee: deploymentFee.toString(),
        deploymentFeeEth: deploymentFeeEth
    };
}

// Execute check
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Check failed:");
        console.error(error);
        process.exit(1);
    });

module.exports = main;
