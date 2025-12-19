const { ethers, network } = require("hardhat");

async function main() {
    console.log("🔍 Checking HYPE deployment fee using Hardhat...\n");

    // Check if we're on the correct network
    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
    console.log(`Connected to chain ID: ${chainId}`);
    
    if (chainId !== 999n) {
        console.log("⚠️  Warning: Not connected to HYPE network (chain ID 999)");
        console.log("Run with: npx hardhat run scripts/check-hype-deployment-fee-hardhat.js --network hyperevm");
    }

    // Factory contract ABI (minimal for deployment fee functions)
    const factoryABI = [
        "function getDeploymentFee() external view returns (uint256)",
        "function HYPE_DEPLOYMENT_FEE() external view returns (uint256)",
        "function APE_DEPLOYMENT_FEE() external view returns (uint256)",
        "function ETH_DEPLOYMENT_FEE() external view returns (uint256)"
    ];

    // You'll need to replace this with your actual deployed factory address on HYPE
    const FACTORY_ADDRESS = "YOUR_FACTORY_ADDRESS_ON_HYPE"; // Replace with actual address
    
    try {
        // Create contract instance using hardhat's provider
        const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, ethers.provider);
        
        // Get all deployment fees
        const [deploymentFee, hypeFee, apeFee, ethFee] = await Promise.all([
            factory.getDeploymentFee(),
            factory.HYPE_DEPLOYMENT_FEE(),
            factory.APE_DEPLOYMENT_FEE(),
            factory.ETH_DEPLOYMENT_FEE()
        ]);
        
        // Convert from wei to tokens
        const deploymentFeeFormatted = ethers.formatEther(deploymentFee);
        const hypeFormatted = ethers.formatEther(hypeFee);
        const apeFormatted = ethers.formatEther(apeFee);
        const ethFormatted = ethers.formatEther(ethFee);
        
        console.log("📊 Deployment Fee Information:");
        console.log("=====================================");
        console.log(`Current deployment fee: ${deploymentFeeFormatted} tokens`);
        console.log(`HYPE_DEPLOYMENT_FEE: ${hypeFormatted} HYPE`);
        console.log(`APE_DEPLOYMENT_FEE: ${apeFormatted} APE`);
        console.log(`ETH_DEPLOYMENT_FEE: ${ethFormatted} ETH`);
        
        // Calculate USD values
        const hypePrice = 43.29; // Current HYPE price in USD
        const ethPrice = 2500; // Approximate ETH price
        const apePrice = 1.2; // Approximate APE price
        
        console.log("\n💰 Approximate USD Values:");
        console.log(`HYPE fee: $${(parseFloat(hypeFormatted) * hypePrice).toFixed(2)}`);
        console.log(`APE fee: $${(parseFloat(apeFormatted) * apePrice).toFixed(2)}`);
        console.log(`ETH fee: $${(parseFloat(ethFormatted) * ethPrice).toFixed(2)}`);
        
        // Show which fee is currently active based on chain
        if (chainId === 999n) {
            console.log(`\n✅ Active fee on HYPE network: ${deploymentFeeFormatted} HYPE ($${(parseFloat(deploymentFeeFormatted) * hypePrice).toFixed(2)})`);
        } else if (chainId === 33139n) {
            console.log(`\n✅ Active fee on APE network: ${deploymentFeeFormatted} APE`);
        } else if (chainId === 1n) {
            console.log(`\n✅ Active fee on ETH network: ${deploymentFeeFormatted} ETH`);
        }
        
        console.log("\n🔧 Raw values (wei):");
        console.log(`Deployment fee: ${deploymentFee.toString()}`);
        console.log(`HYPE constant: ${hypeFee.toString()}`);
        
    } catch (error) {
        console.error("❌ Error fetching deployment fee:", error.message);
        
        if (FACTORY_ADDRESS === "YOUR_FACTORY_ADDRESS_ON_HYPE") {
            console.log("\n⚠️  Please update FACTORY_ADDRESS with your actual deployed factory address");
            console.log("You can find deployment addresses in your deployment files or logs");
        }
        
        if (error.message.includes("could not detect network")) {
            console.log("\n💡 Make sure you're connected to the correct network:");
            console.log("npx hardhat run scripts/check-hype-deployment-fee-hardhat.js --network hyperevm");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });