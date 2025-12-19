const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("🚀 DEPLOYING UPFLOOR STRATEGY FACTORY ON HYPEREVM");
  console.log("═══════════════════════════════════════════════════");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Low balance! Make sure you have enough ETH for deployment");
  }

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  
  console.log("\n📋 Deployment Parameters:");
  console.log("Factory Contract: UpFloorStrategyFactory");
  console.log("Network: HyperEVM (Chain ID: 999)");
  
  try {
    // Deploy the factory contract
    console.log("\n🏗️  Deploying UpFloorStrategyFactory...");
    const UpFloorStrategyFactory = await ethers.getContractFactory("UpFloorStrategyFactory");
    
    // Get deployment bytecode size
    const bytecode = UpFloorStrategyFactory.bytecode;
    console.log("Contract bytecode size:", Math.floor(bytecode.length / 2), "bytes");
    
    if (bytecode.length / 2 > 24576) {
      console.log("⚠️  Contract size is large, may hit size limit");
    }
    
    // Try deployment with higher gas limit
    console.log("Deploying with gas limit: 6,000,000");
    const factory = await UpFloorStrategyFactory.deploy({
      gasLimit: 6000000,
      gasPrice: ethers.parseUnits("200", "gwei") // Higher gas price for HyperEVM
    });
    
    console.log("Deployment transaction:", factory.deploymentTransaction().hash);
    console.log("Waiting for confirmation...");
    
    // Wait for deployment with timeout
    const deploymentPromise = factory.waitForDeployment();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Deployment timeout")), 120000)
    );
    
    await Promise.race([deploymentPromise, timeoutPromise]);
    const factoryAddress = await factory.getAddress();
    
    console.log("✅ UpFloorStrategyFactory deployed to:", factoryAddress);
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const code = await ethers.provider.getCode(factoryAddress);
    if (code === "0x") {
      throw new Error("Contract deployment failed - no code at address");
    }
    console.log("✅ Contract code verified at address");
    
    // Test factory functionality
    console.log("\n🧪 Testing factory functionality...");
    
    // Get strategy count (should be 0 initially)
    const strategyCount = await factory.getStrategyCount();
    console.log("Initial strategy count:", strategyCount.toString());
    
    // Get all strategies (should be empty array)
    const allStrategies = await factory.getAllStrategies();
    console.log("All strategies:", allStrategies);
    
    console.log("✅ Factory functionality verified");
    
    // Save deployment data
    const deploymentData = {
      network: "hyperevm",
      chainId: 999,
      timestamp: Date.now(),
      deployer: deployer.address,
      contracts: {
        UpFloorStrategyFactory: {
          address: factoryAddress,
          deploymentHash: factory.deploymentTransaction().hash
        }
      },
      gasUsed: {
        factory: "~3,000,000" // Estimated
      }
    };
    
    // Create deployment data directory if it doesn't exist
    const deploymentDir = path.join(__dirname, "..", "deploymentData");
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    // Save deployment data
    const filename = `hyperevm-factory-deployment-${Date.now()}.json`;
    const filepath = path.join(deploymentDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
    
    console.log("\n✅ Deployment completed successfully!");
    console.log("\n═══════════════════════════════════════════════════");
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Network:              HyperEVM");
    console.log("Chain ID:             999");
    console.log("Factory Address:      ", factoryAddress);
    console.log("Deployer:             ", deployer.address);
    console.log("Deployment Hash:      ", factory.deploymentTransaction().hash);
    console.log("Deployment Data:      ", filename);
    console.log("═══════════════════════════════════════════════════");
    
    console.log("\n🔗 Next Steps:");
    console.log("1. Create a strategy using the factory");
    console.log("2. Deploy token contracts for your strategies");
    console.log("3. Set up NFT marketplace integrations");
    
    console.log("\n📝 Example Strategy Creation:");
    console.log(`const factory = new ethers.Contract("${factoryAddress}", factoryABI, signer);`);
    console.log(`await factory.createStrategy("MyStrategy", "MYSTRAT", nftCollection, marketplace);`);
    
    return {
      factoryAddress,
      deploymentHash: factory.deploymentTransaction().hash,
      network: "hyperevm",
      chainId: 999
    };
    
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Add more ETH to your wallet");
      console.log("Deployer address:", deployer.address);
    } else if (error.message.includes("gas")) {
      console.log("\n💡 Solution: Try increasing gas limit or gas price");
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });