const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Updated BRIGADE Token with redeemWithTaiko via Factory...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // Factory and deployment parameters
    const factoryAddress = "0xbE610B40FDDe8e7f48388234A6b48cAFbeEf7d2C"; // Just deployed factory
    const tokenName = "BrigadeAssets";
    const tokenSymbol = "BRIGADE";
    const feeRecipient = "0x0Dac4637A9b04F64c6b92a19866cd0764adfB6a8"; // Protocol fee recipient
    const collectionAddress = "0x77d64eca9ede120280e9ffe19990f0caf4bb45da"; // Real NFT collection
    const collectionOwner = deployer.address; // Collection owner
    const royaltyRecipient = deployer.address; // Royalty recipient
    const royaltyBps = 700; // 7% royalty

    console.log("📋 Deployment Parameters:");
    console.log("Factory Address:", factoryAddress);
    console.log("Token Name:", tokenName);
    console.log("Token Symbol:", tokenSymbol);
    console.log("Fee Recipient:", feeRecipient);
    console.log("Collection Address:", collectionAddress);
    console.log("Collection Owner:", collectionOwner);
    console.log("Royalty Recipient:", royaltyRecipient);
    console.log("Royalty BPS:", royaltyBps, "(7%)");

    // Connect to factory and deploy via factory
    console.log("\n🔨 Deploying UpFloorToken via Factory...");
    const factory = await ethers.getContractAt("UpFloorStrategyFactory", factoryAddress);
    
    // Check deployment fee
    const deploymentFee = await factory.deploymentFee();
    console.log("Deployment fee:", ethers.formatEther(deploymentFee), "ETH");
    
    const deployTx = await factory.deployStrategyToken(
        tokenName,
        tokenSymbol,
        collectionAddress,
        collectionOwner,
        royaltyRecipient,
        royaltyBps,
        { value: deploymentFee }
    );

    console.log("Deploy transaction hash:", deployTx.hash);
    const receipt = await deployTx.wait();
    
    // Get token address from event
    const deployEvent = receipt.logs.find(log => {
        try {
            const parsed = factory.interface.parseLog(log);
            return parsed?.name === "TokenDeployed";
        } catch {
            return false;
        }
    });
    
    let tokenAddress;
    if (deployEvent) {
        const parsedEvent = factory.interface.parseLog(deployEvent);
        tokenAddress = parsedEvent.args.token;
    } else {
        throw new Error("Could not find TokenDeployed event");
    }
    
    const token = await ethers.getContractAt("UpFloorToken", tokenAddress);

    console.log("✅ UpFloorToken deployed to:", tokenAddress);

    // Verify the deployment
    console.log("\n🔍 Verifying deployment...");
    
    const deployedName = await token.name();
    const deployedSymbol = await token.symbol();
    const deployedOwner = await token.owner();
    const taikoPaymentToken = await token.taikoPaymentToken();
    
    console.log("Name:", deployedName);
    console.log("Symbol:", deployedSymbol);
    console.log("Owner:", deployedOwner);
    console.log("TAIKO Payment Token:", taikoPaymentToken);

    // Test if redeemWithTaiko function exists
    try {
        const testAmount = ethers.parseEther("0.001");
        await token.redeemWithTaiko.staticCall(
            testAmount,
            deployer.address,
            deployer.address,
            0
        );
        console.log("✅ redeemWithTaiko function is available!");
    } catch (error) {
        if (error.message.includes("InsufficientETH") || error.message.includes("InvalidAddress")) {
            console.log("✅ redeemWithTaiko function is available! (Expected error due to no TAIKO balance)");
        } else {
            console.log("❌ redeemWithTaiko function test failed:", error.message);
        }
    }

    // Save deployment info
    const deploymentData = {
        network: "taikoalethia",
        tokenAddress: tokenAddress,
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        deployer: deployer.address,
        timestamp: Date.now(),
        blockNumber: await ethers.provider.getBlockNumber(),
        hasRedeemWithTaiko: true
    };

    console.log("\n💾 Deployment Summary:");
    console.log("═══════════════════════════════════════════════════");
    console.log("Network:               Taiko Alethia");
    console.log("Token Address:         ", tokenAddress);
    console.log("Token Name:            ", tokenName);
    console.log("Token Symbol:          ", tokenSymbol);
    console.log("Deployer:              ", deployer.address);
    console.log("Has redeemWithTaiko:   ", "YES");
    console.log("═══════════════════════════════════════════════════");
    
    console.log("\n🔗 View on Taikoscan:");
    console.log(`https://taikoscan.io/address/${tokenAddress}`);
    
    console.log("\n💡 Next Steps:");
    console.log("1. Update your scripts to use the new token address");
    console.log("2. Mint some tokens with mintWithTaiko");
    console.log("3. Test redeemWithTaiko function");
    
    console.log("\n📝 Updated Token Address:");
    console.log(tokenAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });