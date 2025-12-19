const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🚀 Deploying BrigadeAssets Token on Taiko...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // Configuration
    const FACTORY_ADDRESS = "0x236C46bB3489ccdEB1661c4d30bE954eE5161D7f";
    const NFT_COLLECTION = "0x77d64eca9ede120280e9ffe19990f0caf4bb45da";
    const TOKEN_NAME = "BrigadeAssets";
    const TOKEN_SYMBOL = "BRIGADE";
    const COLLECTION_OWNER = deployer.address;
    const ROYALTY_RECIPIENT = "0x0dac4637a9b04f64c6b92a19866cd0764adfb6a8";
    const ROYALTY_BPS = 700; // 7%

    console.log("Configuration:");
    console.log("  Factory:", FACTORY_ADDRESS);
    console.log("  NFT Collection:", NFT_COLLECTION);
    console.log("  Token Name:", TOKEN_NAME);
    console.log("  Token Symbol:", TOKEN_SYMBOL);
    console.log("  Collection Owner:", COLLECTION_OWNER);
    console.log("  Royalty Recipient:", ROYALTY_RECIPIENT);
    console.log("  Royalty:", ROYALTY_BPS / 100, "%\n");

    // Connect to factory
    const factory = await ethers.getContractAt("UpFloorStrategyFactory", FACTORY_ADDRESS);
    
    // Get deployment fee
    const deploymentFee = await factory.getDeploymentFee();
    console.log("💰 Deployment fee:", ethers.formatEther(deploymentFee), "ETH");

    // Check balance
    if (balance < deploymentFee) {
        console.error("❌ Insufficient balance for deployment fee");
        process.exit(1);
    }

    // Deploy strategy token
    console.log("\n📦 Deploying strategy token...");
    const tx = await factory.deployStrategyToken(
        TOKEN_NAME,
        TOKEN_SYMBOL,
        NFT_COLLECTION,
        COLLECTION_OWNER,
        ROYALTY_RECIPIENT,
        ROYALTY_BPS,
        { value: deploymentFee }
    );

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");

    // Extract addresses from event
    const event = receipt.logs.find(log => {
        try {
            const parsed = factory.interface.parseLog(log);
            return parsed?.name === "TokenDeployed";
        } catch {
            return false;
        }
    });

    if (!event) {
        console.error("❌ Could not find TokenDeployed event");
        process.exit(1);
    }

    const parsedEvent = factory.interface.parseLog(event);
    const tokenAddress = parsedEvent.args.token;
    const routerAddress = parsedEvent.args.router;
    const strategyAddress = parsedEvent.args.strategy;

    console.log("\n📋 Deployed Addresses:");
    console.log("  Token:", tokenAddress);
    console.log("  Router:", routerAddress);
    console.log("  Strategy:", strategyAddress);

    // Verify Taiko configuration
    console.log("\n⚙️  Verifying Taiko configuration...");
    const token = await ethers.getContractAt("UpFloorToken", tokenAddress);
    
    const taikoMarketplace = await token.taikoMarketplace();
    const taikoPaymentToken = await token.taikoPaymentToken();
    
    console.log("  Taiko Marketplace:", taikoMarketplace);
    console.log("  Taiko Payment Token:", taikoPaymentToken);

    if (taikoMarketplace === "0x89aFa165F40f2210c99e87E706C0160503E12F1c") {
        console.log("  ✅ Taiko marketplace auto-configured");
    }
    if (taikoPaymentToken === "0xA9d23408b9bA935c230493c40C73824Df71A0975") {
        console.log("  ✅ Taiko payment token auto-configured");
    }

    // Save deployment data
    const deploymentData = {
        network: "taiko",
        chainId: 167000,
        timestamp: Date.now(),
        deployer: deployer.address,
        collection: {
            name: TOKEN_NAME,
            symbol: TOKEN_SYMBOL,
            nftCollection: NFT_COLLECTION,
            collectionOwner: COLLECTION_OWNER,
            royaltyRecipient: ROYALTY_RECIPIENT,
            royaltyBps: ROYALTY_BPS
        },
        contracts: {
            factory: FACTORY_ADDRESS,
            token: tokenAddress,
            router: routerAddress,
            strategy: strategyAddress
        },
        taiko: {
            marketplace: taikoMarketplace,
            paymentToken: taikoPaymentToken,
            autoConfigured: true
        },
        transactionHash: tx.hash,
        deploymentFee: ethers.formatEther(deploymentFee)
    };

    const deploymentDir = path.join(__dirname, "..", "deploymentData");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const filename = `taiko-brigade-deployment-${Date.now()}.json`;
    const filepath = path.join(deploymentDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));

    console.log("\n💾 Deployment data saved to:", filename);

    // Verification commands
    console.log("\n📝 Verification Commands:");
    console.log(`\nToken:`);
    console.log(`npx hardhat verify --network taikoalethia ${tokenAddress} "${TOKEN_NAME}" "${TOKEN_SYMBOL}" "0x0Dac4637A9b04F64c6b92a19866cd0764adfB6a8" "${NFT_COLLECTION}" "${COLLECTION_OWNER}" "${ROYALTY_RECIPIENT}" ${ROYALTY_BPS}`);
    
    console.log(`\nStrategy:`);
    console.log(`npx hardhat verify --network taikoalethia ${strategyAddress} "${tokenAddress}" "${NFT_COLLECTION}"`);
    
    console.log(`\nRouter:`);
    console.log(`npx hardhat verify --network taikoalethia ${routerAddress} "${tokenAddress}"`);

    console.log("\n✅ Deployment complete!\n");

    // Display summary
    console.log("═══════════════════════════════════════════════════");
    console.log("📋 BRIGADE ASSETS DEPLOYMENT SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Token Name:           ", TOKEN_NAME);
    console.log("Token Symbol:         ", TOKEN_SYMBOL);
    console.log("NFT Collection:       ", NFT_COLLECTION);
    console.log("Token Address:        ", tokenAddress);
    console.log("Router Address:       ", routerAddress);
    console.log("Strategy Address:     ", strategyAddress);
    console.log("Royalty Recipient:    ", ROYALTY_RECIPIENT);
    console.log("Royalty:              ", ROYALTY_BPS / 100, "%");
    console.log("Taiko Marketplace:    ", taikoMarketplace);
    console.log("Taiko Payment Token:  ", taikoPaymentToken);
    console.log("═══════════════════════════════════════════════════");
    console.log("\n🔗 View on Taikoscan:");
    console.log("Token:    https://taikoscan.io/address/" + tokenAddress);
    console.log("Router:   https://taikoscan.io/address/" + routerAddress);
    console.log("Strategy: https://taikoscan.io/address/" + strategyAddress);
    console.log("═══════════════════════════════════════════════════\n");

    return {
        token: tokenAddress,
        router: routerAddress,
        strategy: strategyAddress
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;
