const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🐒 Checking ApeChain deployment fee...\n");

    const FACTORY_ADDRESS = "0x2fC63b3F35F5738BeE40727cd0697177Af7E78a0";
    
    // Load the minimal ABI
    const abiPath = path.join(__dirname, "..", "abis", "UpFloorStrategyFactory.minimal.abi.json");
    const factoryABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    
    try {
        // Connect to ApeChain network
        const provider = new ethers.JsonRpcProvider("https://rpc.apechain.com");
        
        // Create contract instance
        const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, provider);
        
        // Get network info
        const network = await provider.getNetwork();
        console.log("🌐 Network Information:");
        console.log(`Chain ID: ${network.chainId}`);
        console.log(`Factory Address: ${FACTORY_ADDRESS}\n`);
        
        // Get all deployment fees
        console.log("📊 Fetching deployment fees...");
        const [deploymentFee, apeFee, ethFee, hypeFee, protocolRecipient] = await Promise.all([
            factory.getDeploymentFee(),
            factory.APE_DEPLOYMENT_FEE(),
            factory.ETH_DEPLOYMENT_FEE(),
            factory.HYPE_DEPLOYMENT_FEE(),
            factory.PROTOCOL_FEE_RECIPIENT()
        ]);
        
        // Convert from wei to tokens
        const deploymentFeeFormatted = ethers.formatEther(deploymentFee);
        const apeFormatted = ethers.formatEther(apeFee);
        const ethFormatted = ethers.formatEther(ethFee);
        const hypeFormatted = ethers.formatEther(hypeFee);
        
        console.log("\n💰 Deployment Fee Information:");
        console.log("=====================================");
        console.log(`Current deployment fee: ${deploymentFeeFormatted} APE`);
        console.log(`APE_DEPLOYMENT_FEE: ${apeFormatted} APE`);
        console.log(`ETH_DEPLOYMENT_FEE: ${ethFormatted} ETH`);
        console.log(`HYPE_DEPLOYMENT_FEE: ${hypeFormatted} HYPE`);
        console.log(`Protocol fee recipient: ${protocolRecipient}`);
        
        // Verify the current fee matches APE fee (should be true on ApeChain)
        if (deploymentFee.toString() === apeFee.toString()) {
            console.log("\n✅ Deployment fee correctly set to APE_DEPLOYMENT_FEE");
        } else {
            console.log("\n⚠️  Deployment fee mismatch!");
            console.log(`Expected: ${apeFormatted} APE`);
            console.log(`Actual: ${deploymentFeeFormatted} APE`);
        }
        
        // Calculate approximate USD value (assuming APE ~$1.20)
        const apePrice = 1.20; // Approximate APE price in USD
        const usdValue = parseFloat(apeFormatted) * apePrice;
        
        console.log("\n💵 USD Value Estimates:");
        console.log(`APE fee: $${usdValue.toFixed(2)} (at $${apePrice}/APE)`);
        
        console.log("\n🔧 Raw Values (wei):");
        console.log(`Current fee: ${deploymentFee.toString()}`);
        console.log(`APE constant: ${apeFee.toString()}`);
        console.log(`ETH constant: ${ethFee.toString()}`);
        console.log(`HYPE constant: ${hypeFee.toString()}`);
        
    } catch (error) {
        console.error("❌ Error fetching deployment fee:", error.message);
        
        if (error.message.includes("could not detect network")) {
            console.log("\n💡 Network connection issue. Trying with Hardhat provider...");
            
            // Fallback to hardhat provider if direct connection fails
            try {
                const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, ethers.provider);
                const deploymentFee = await factory.getDeploymentFee();
                const apeFee = await factory.APE_DEPLOYMENT_FEE();
                
                console.log(`Deployment fee: ${ethers.formatEther(deploymentFee)} APE`);
                console.log(`APE constant: ${ethers.formatEther(apeFee)} APE`);
            } catch (fallbackError) {
                console.log("Fallback also failed:", fallbackError.message);
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });