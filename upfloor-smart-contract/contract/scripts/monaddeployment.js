const hre = require("hardhat");

/**
 * Update Monad Mainnet Deployment Fee
 * 
 * This script updates the deployment fee on the UpFloorStrategyFactory
 * deployed on Monad mainnet to use APE_DEPLOYMENT_FEE (2500 ETH)
 * 
 * Usage:
 *   npx hardhat run scripts/monaddeployment.js --network monadmainnet
 */

async function main() {
    console.log("\n========================================");
    console.log("🔧 Monad Deployment Fee Update");
    console.log("========================================\n");

    // Factory address from deployment
    const factoryAddress = "0x5EE7b8e36636EABF89513b1E456E0E36cC296f5E";

    // New deployment fee (APE_DEPLOYMENT_FEE = 2500 * 1e18)
    const newDeploymentFee = hre.ethers.parseEther("2500");

    // Get signer
    const [signer] = await hre.ethers.getSigners();
    console.log("📝 Updating from account:", signer.address);

    // Get balance
    const balance = await hre.ethers.provider.getBalance(signer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
    console.log();

    // Get network info
    const network = await hre.ethers.provider.getNetwork();
    console.log("🌐 Network:", hre.network.name);
    console.log("🔗 Chain ID:", network.chainId.toString());
    console.log("📍 Factory Address:", factoryAddress);
    console.log();

    // Connect to factory
    console.log("🔗 Connecting to factory...");
    const factory = await hre.ethers.getContractAt("UpFloorStrategyFactory", factoryAddress);
    console.log("✅ Connected to factory");
    console.log();

    // Check current owner
    const owner = await factory.owner();
    console.log("👤 Current factory owner:", owner);

    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.log("⚠️  WARNING: You are not the owner of this factory!");
        console.log("   Owner:", owner);
        console.log("   Your address:", signer.address);
        console.log();
        throw new Error("Only the factory owner can update the deployment fee");
    }
    console.log("✅ You are the factory owner");
    console.log();

    // Get current deployment fee
    const currentFee = await factory.getDeploymentFee();
    const currentFeeEth = hre.ethers.formatEther(currentFee);

    console.log("📊 Current Deployment Fee:");
    console.log("─────────────────────────────────────");
    console.log("Wei:", currentFee.toString());
    console.log("ETH:", currentFeeEth);
    console.log();

    console.log("📊 New Deployment Fee (APE_DEPLOYMENT_FEE):");
    console.log("─────────────────────────────────────");
    console.log("Wei:", newDeploymentFee.toString());
    console.log("ETH:", hre.ethers.formatEther(newDeploymentFee));
    console.log();

    // Check if update is needed
    if (currentFee.toString() === newDeploymentFee.toString()) {
        console.log("✅ Deployment fee is already set to the target value");
        console.log("   No update needed!");
        console.log();
    } else {
        console.log("🔄 Updating deployment fee...");

        // Update deployment fee
        const tx = await factory.setDeploymentFee(newDeploymentFee);
        console.log("📝 Transaction hash:", tx.hash);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");
        console.log("📦 Block number:", receipt.blockNumber);
        console.log("⛽ Gas used:", receipt.gasUsed.toString());
        console.log();

        // Verify the update
        const updatedFee = await factory.getDeploymentFee();
        const updatedFeeEth = hre.ethers.formatEther(updatedFee);

        console.log("✅ Updated Deployment Fee:");
        console.log("─────────────────────────────────────");
        console.log("Wei:", updatedFee.toString());
        console.log("ETH:", updatedFeeEth);
        console.log();

        if (updatedFee.toString() === newDeploymentFee.toString()) {
            console.log("✅ Deployment fee successfully updated!");
        } else {
            console.log("❌ WARNING: Deployment fee mismatch!");
            console.log("   Expected:", hre.ethers.formatEther(newDeploymentFee));
            console.log("   Actual:", updatedFeeEth);
        }
        console.log();
    }

    console.log("========================================");
    console.log("✅ Update Complete!");
    console.log("========================================\n");

    return {
        factoryAddress,
        previousFee: currentFeeEth,
        newFee: hre.ethers.formatEther(newDeploymentFee),
        transactionHash: currentFee.toString() === newDeploymentFee.toString() ? "No update needed" : tx.hash
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Update failed:");
        console.error(error);
        process.exit(1);
    });

module.exports = main;
