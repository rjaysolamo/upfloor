const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking HYPE deployment fee...\n");

    // Factory contract ABI (minimal for getDeploymentFee function)
    const factoryABI = [
        "function getDeploymentFee() external view returns (uint256)",
        "function HYPE_DEPLOYMENT_FEE() external view returns (uint256)"
    ];

    // You'll need to replace this with your actual deployed factory address on HYPE
    const FACTORY_ADDRESS = "YOUR_FACTORY_ADDRESS_ON_HYPE"; // Replace with actual address
    
    try {
        // Connect to HYPE network
        const provider = new ethers.JsonRpcProvider("https://hyperliquid-mainnet.g.alchemy.com/v2/OPLiHQCXVIkbWUj74xeWKFU4nPz6hp0a");
        
        // Create contract instance
        const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, provider);
        
        // Get current deployment fee
        const deploymentFee = await factory.getDeploymentFee();
        const hypeFee = await factory.HYPE_DEPLOYMENT_FEE();
        
        // Convert from wei to HYPE tokens
        const deploymentFeeInHype = ethers.formatEther(deploymentFee);
        const constantFeeInHype = ethers.formatEther(hypeFee);
        
        console.log("📊 HYPE Deployment Fee Information:");
        console.log("=====================================");
        console.log(`Current deployment fee: ${deploymentFeeInHype} HYPE`);
        console.log(`HYPE_DEPLOYMENT_FEE constant: ${constantFeeInHype} HYPE`);
        console.log(`Raw deployment fee (wei): ${deploymentFee.toString()}`);
        console.log(`Raw constant fee (wei): ${hypeFee.toString()}`);
        
        // Calculate USD value at current HYPE price
        const hypePrice = 43.29; // Current HYPE price in USD
        const usdValue = parseFloat(deploymentFeeInHype) * hypePrice;
        const constantUsdValue = parseFloat(constantFeeInHype) * hypePrice;
        
        console.log("\n💰 USD Values (at $43.29/HYPE):");
        console.log(`Current fee: $${usdValue.toFixed(2)}`);
        console.log(`Constant fee: $${constantUsdValue.toFixed(2)}`);
        
        // Network info
        const network = await provider.getNetwork();
        console.log("\n🌐 Network Information:");
        console.log(`Chain ID: ${network.chainId}`);
        console.log(`Network Name: ${network.name}`);
        
    } catch (error) {
        console.error("❌ Error fetching deployment fee:", error.message);
        
        if (FACTORY_ADDRESS === "YOUR_FACTORY_ADDRESS_ON_HYPE") {
            console.log("\n⚠️  Please update FACTORY_ADDRESS with your actual deployed factory address on HYPE network");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });