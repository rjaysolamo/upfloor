const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🚀 Deploying UpFloor Factory to Taiko Network...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // Check network
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId.toString());
    
    if (network.chainId !== 167000n) {
        console.log("⚠️  Warning: Not on Taiko mainnet (expected chain ID 167000)");
    }

    // Deploy Factory
    console.log("\n📦 Deploying UpFloorStrategyFactory...");
    const Factory = await ethers.getContractFactory("UpFloorStrategyFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    const factoryAddress = await factory.getAddress();
    console.log("✅ Factory deployed at:", factoryAddress);

    // Get deployment fee
    const deploymentFee = await factory.getDeploymentFee();
    console.log("💰 Deployment fee:", ethers.formatEther(deploymentFee), "ETH");

    // Save deployment data
    const deploymentData = {
        network: "taiko",
        chainId: network.chainId.toString(),
        timestamp: Date.now(),
        deployer: deployer.address,
        contracts: {
            factory: factoryAddress
        },
        configuration: {
            deploymentFee: ethers.formatEther(deploymentFee)
        },
        notes: {
            protocolFeeRecipient: "0x0dac4637a9b04f64c6b92a19866cd0764adfb6a8 (hardcoded in factory)",
            taikoMarketplace: "0x89aFa165F40f2210c99e87E706C0160503E12F1c (auto-configured)",
            taikoPaymentToken: "0xA9d23408b9bA935c230493c40C73824Df71A0975 (auto-configured)"
        }
    };

    const deploymentDir = path.join(__dirname, "..", "deploymentData");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const filename = `taiko-factory-deployment-${Date.now()}.json`;
    const filepath = path.join(deploymentDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));

    console.log("\n💾 Deployment data saved to:", filename);

    // Verification command
    console.log("\n📝 Verification Command:");
    console.log(`npx hardhat verify --network taikoalethia ${factoryAddress}`);

    console.log("\n✅ Deployment complete!\n");

    // Display summary
    console.log("═══════════════════════════════════════════════════");
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Network:              Taiko (Alethia)");
    console.log("Chain ID:             167000");
    console.log("Factory Address:      ", factoryAddress);
    console.log("Deployment Fee:       ", ethers.formatEther(deploymentFee), "ETH");
    console.log("Protocol Fee:         0x0dac4637a9b04f64c6b92a19866cd0764adfb6a8");
    console.log("Taiko Marketplace:    0x89aFa165F40f2210c99e87E706C0160503E12F1c");
    console.log("Taiko Payment Token:  0xA9d23408b9bA935c230493c40C73824Df71A0975");
    console.log("═══════════════════════════════════════════════════\n");

    return {
        factory: factoryAddress,
        deploymentFee: ethers.formatEther(deploymentFee)
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;
