const { ethers } = require("hardhat");

// HyperEVM deployment addresses (update after factory deployment)
const FACTORY_ADDRESS = ""; // Will be filled after deployment
const HYPEREVM_WETH = "0x4200000000000000000000000000000000000006"; // Common WETH address on L2s
const HYPEREVM_NFT_MARKETPLACE = ""; // Update with HyperEVM NFT marketplace

// Strategy parameters
const STRATEGY_NAME = "HyperEVM Brigade Strategy";
const STRATEGY_SYMBOL = "HYPERBRIGADE";
const TARGET_NFT_COLLECTION = "0x1234567890123456789012345678901234567890"; // Update with real collection

// Factory ABI (minimal)
const FACTORY_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "string", "name": "symbol", "type": "string"},
      {"internalType": "address", "name": "nftCollection", "type": "address"},
      {"internalType": "address", "name": "marketplace", "type": "address"}
    ],
    "name": "createStrategy",
    "outputs": [
      {"internalType": "address", "name": "strategy", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getStrategyCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllStrategies",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createStrategy() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("🏗️  CREATING STRATEGY ON HYPEREVM");
  console.log("═══════════════════════════════════════════════════");

  if (!FACTORY_ADDRESS) {
    console.error("❌ Please update FACTORY_ADDRESS after deploying the factory");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Creating strategy with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Connect to factory
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, deployer);
  
  console.log("\n📋 Strategy Parameters:");
  console.log("Name:                 ", STRATEGY_NAME);
  console.log("Symbol:               ", STRATEGY_SYMBOL);
  console.log("NFT Collection:       ", TARGET_NFT_COLLECTION);
  console.log("Marketplace:          ", HYPEREVM_NFT_MARKETPLACE);
  console.log("Factory Address:      ", FACTORY_ADDRESS);

  try {
    // Check current strategy count
    const currentCount = await factory.getStrategyCount();
    console.log("\nCurrent strategy count:", currentCount.toString());

    // Create the strategy
    console.log("\n🚀 Creating strategy...");
    const createTx = await factory.createStrategy(
      STRATEGY_NAME,
      STRATEGY_SYMBOL,
      TARGET_NFT_COLLECTION,
      HYPEREVM_NFT_MARKETPLACE || ethers.ZeroAddress, // Use zero address if no marketplace
      { gasLimit: 5000000 }
    );

    console.log("Transaction hash:", createTx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await createTx.wait();
    console.log("✅ Strategy created successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Parse the creation event to get addresses
    const createEvent = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed.name === "StrategyCreated";
      } catch {
        return false;
      }
    });

    if (createEvent) {
      const parsed = factory.interface.parseLog(createEvent);
      const strategyAddress = parsed.args.strategy;
      const tokenAddress = parsed.args.token;
      
      console.log("\n🎉 New Strategy Created:");
      console.log("Strategy Address:     ", strategyAddress);
      console.log("Token Address:        ", tokenAddress);
      
      // Verify the new count
      const newCount = await factory.getStrategyCount();
      console.log("New strategy count:   ", newCount.toString());
      
      return {
        strategyAddress,
        tokenAddress,
        transactionHash: createTx.hash,
        gasUsed: receipt.gasUsed.toString()
      };
    } else {
      console.log("⚠️  Could not parse creation event, but transaction succeeded");
      return { transactionHash: createTx.hash };
    }

  } catch (error) {
    console.error("\n❌ Strategy creation failed:");
    console.error(error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Add more ETH to your wallet");
    } else if (error.message.includes("gas")) {
      console.log("\n💡 Solution: Try increasing gas limit");
    }
    
    throw error;
  }
}

async function main() {
  try {
    const result = await createStrategy();
    
    console.log("\n✅ Strategy creation completed!");
    console.log("\n🔗 Next Steps:");
    console.log("1. Fund the token contract with ETH/tokens");
    console.log("2. Test minting tokens");
    console.log("3. Test NFT purchases");
    console.log("4. Set up reward mechanisms");
    
  } catch (error) {
    console.error("Strategy creation failed:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);