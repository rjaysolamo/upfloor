const { ethers } = require("hardhat");

// Configuration
const FACTORY_ADDRESS = "0xbE610B40FDDe8e7f48388234A6b48cAFbeEf7d2C";
const TOKEN_ADDRESS = "0xA46DD94c18D242859602f83115d33274aC20aEc2"; // From our deployment
const DEPLOYMENT_TX_HASH = "0xf5e30b10811d1b9ad564a03014f2adb6c6ff968178423dd8dafaf8f2c37f6c77"; // From deployment

async function main() {
    console.log("🔍 Getting Deployment Details...\n");

    const [user] = await ethers.getSigners();
    console.log("User address:", user.address);

    // Connect to factory
    const factory = await ethers.getContractAt("UpFloorStrategyFactory", FACTORY_ADDRESS);

    console.log("📋 Deployment Information:");
    console.log("Factory Address:", FACTORY_ADDRESS);
    console.log("Token Address:", TOKEN_ADDRESS);
    console.log("Deployment TX:", DEPLOYMENT_TX_HASH);

    try {
        // Method 1: Get details from factory mappings
        console.log("\n🏭 Getting details from Factory...");
        
        const strategy = await factory.getTokenStrategy(TOKEN_ADDRESS);
        console.log("Strategy Address:", strategy);

        const isDeployed = await factory.isDeployedToken(TOKEN_ADDRESS);
        console.log("Is Deployed Token:", isDeployed);

        const userTokens = await factory.getUserTokens(user.address);
        console.log("Your Deployed Tokens:", userTokens);

        // Method 2: Parse the deployment transaction receipt
        console.log("\n📜 Parsing Deployment Transaction...");
        
        const receipt = await ethers.provider.getTransactionReceipt(DEPLOYMENT_TX_HASH);
        if (receipt) {
            console.log("Transaction Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
            console.log("Gas Used:", receipt.gasUsed.toString());
            
            // Parse TokenDeployed event
            const deployEvent = receipt.logs.find(log => {
                try {
                    const parsed = factory.interface.parseLog(log);
                    return parsed?.name === "TokenDeployed";
                } catch {
                    return false;
                }
            });

            if (deployEvent) {
                const parsedEvent = factory.interface.parseLog(deployEvent);
                console.log("\n🎉 TokenDeployed Event Details:");
                console.log("Deployer:", parsedEvent.args.deployer);
                console.log("Token:", parsedEvent.args.token);
                console.log("Router:", parsedEvent.args.router);
                console.log("Strategy:", parsedEvent.args.strategy);
                console.log("Name:", parsedEvent.args.name);
                console.log("Symbol:", parsedEvent.args.symbol);
                console.log("Deployment Fee:", ethers.formatEther(parsedEvent.args.deploymentFee), "ETH");
            } else {
                console.log("❌ TokenDeployed event not found in transaction");
            }
        } else {
            console.log("❌ Transaction receipt not found");
        }

        // Method 3: Connect to token and get additional info
        console.log("\n🪙 Token Contract Details...");
        const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
        
        const name = await token.name();
        const symbol = await token.symbol();
        const owner = await token.owner();
        const totalSupply = await token.totalSupply();
        const collectionAddress = await token.getCollectionAddress();
        const taikoPaymentToken = await token.taikoPaymentToken();
        
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Owner:", owner);
        console.log("Total Supply:", ethers.formatEther(totalSupply));
        console.log("Collection Address:", collectionAddress);
        console.log("TAIKO Payment Token:", taikoPaymentToken);

        // Method 4: Try to find router address by checking for MintRouter deployment
        console.log("\n🔍 Searching for Router Address...");
        
        // The router should be deployed right after the token in the same transaction
        // Let's check all contract creation events in the transaction
        const contractCreations = receipt.logs.filter(log => {
            // Contract creation events typically have specific patterns
            return log.topics.length > 0;
        });

        console.log("Contract creation events found:", contractCreations.length);

        // Alternative: Check if we can find router by looking at recent transactions
        const block = await ethers.provider.getBlock(receipt.blockNumber);
        console.log("Block Number:", receipt.blockNumber);
        console.log("Block Timestamp:", new Date(block.timestamp * 1000).toISOString());

    } catch (error) {
        console.error("❌ Error getting deployment details:", error.message);
    }

    console.log("\n═══════════════════════════════════════════════════");
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Factory:               ", FACTORY_ADDRESS);
    console.log("Token:                 ", TOKEN_ADDRESS);
    
    try {
        const strategy = await factory.getTokenStrategy(TOKEN_ADDRESS);
        console.log("Strategy:              ", strategy);
    } catch {
        console.log("Strategy:               Unable to retrieve");
    }
    
    console.log("Deployment TX:         ", DEPLOYMENT_TX_HASH);
    console.log("═══════════════════════════════════════════════════");
    
    console.log("\n🔗 Taikoscan Links:");
    console.log(`Factory: https://taikoscan.io/address/${FACTORY_ADDRESS}`);
    console.log(`Token: https://taikoscan.io/address/${TOKEN_ADDRESS}`);
    console.log(`Transaction: https://taikoscan.io/tx/${DEPLOYMENT_TX_HASH}`);
}

main().catch(console.error);