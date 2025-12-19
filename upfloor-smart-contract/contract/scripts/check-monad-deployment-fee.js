const hre = require("hardhat");

async function main() {
    console.log("\n========================================");
    console.log("💰 Monad Deployment Fee Check");
    console.log("========================================\n");

    // Factory address from recent deployment
    const factoryAddress = "0x5EE7b8e36636EABF89513b1E456E0E36cC296f5E";

    // Get network info
    const network = await hre.ethers.provider.getNetwork();
    console.log("🌐 Network:", hre.network.name);
    console.log("🔗 Chain ID:", network.chainId.toString());
    console.log("📍 Factory Address:", factoryAddress);
    console.log();

    // Connect to factory
    const factory = await hre.ethers.getContractAt("UpFloorStrategyFactory", factoryAddress);

    // Get deployment fee
    const deploymentFee = await factory.getDeploymentFee();
    const deploymentFeeEth = hre.ethers.formatEther(deploymentFee);

    console.log("💰 Current Deployment Fee:");
    console.log("─────────────────────────────────────");
    console.log("Wei:       ", deploymentFee.toString());
    console.log("ETH:       ", deploymentFeeEth);
    console.log();

    // Show constant values from contract
    console.log("📋 Contract Constants:");
    console.log("─────────────────────────────────────");

    const APE_DEPLOYMENT_FEE = hre.ethers.parseEther("2500"); // 2500 * 1e18
    const ETH_DEPLOYMENT_FEE = hre.ethers.parseEther("0.026"); // 0.026 * 1e18
    const HYPE_DEPLOYMENT_FEE = hre.ethers.parseEther("2.31"); // 2.31 * 1e18

    console.log("APE_DEPLOYMENT_FEE:  ", hre.ethers.formatEther(APE_DEPLOYMENT_FEE), "ETH");
    console.log("ETH_DEPLOYMENT_FEE:  ", hre.ethers.formatEther(ETH_DEPLOYMENT_FEE), "ETH");
    console.log("HYPE_DEPLOYMENT_FEE: ", hre.ethers.formatEther(HYPE_DEPLOYMENT_FEE), "ETH");
    console.log();

    // Check which constant is being used
    console.log("📊 Analysis:");
    console.log("─────────────────────────────────────");
    if (deploymentFee.toString() === APE_DEPLOYMENT_FEE.toString()) {
        console.log("✅ Using APE_DEPLOYMENT_FEE (2500 ETH)");
        console.log("   This is for ApeChain (Chain ID 33139)");
    } else if (deploymentFee.toString() === ETH_DEPLOYMENT_FEE.toString()) {
        console.log("✅ Using ETH_DEPLOYMENT_FEE (0.026 ETH)");
        console.log("   This is the default for Ethereum and other chains");
        console.log("   NOTE: Comment in contract suggests using APE fee for Monad");
    } else if (deploymentFee.toString() === HYPE_DEPLOYMENT_FEE.toString()) {
        console.log("✅ Using HYPE_DEPLOYMENT_FEE (2.31 ETH)");
        console.log("   This is for HyperEVM (Chain ID 999)");
    } else {
        console.log("⚠️  Using custom deployment fee");
    }
    console.log();

    // Get protocol fee recipient
    const protocolFeeRecipient = await factory.PROTOCOL_FEE_RECIPIENT();
    console.log("💼 Protocol Fee Recipient:", protocolFeeRecipient);
    console.log();

    console.log("========================================");
    console.log("✅ Check Complete!");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:");
        console.error(error);
        process.exit(1);
    });
