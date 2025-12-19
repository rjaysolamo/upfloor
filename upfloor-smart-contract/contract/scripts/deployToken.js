const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Token Deployment via Factory...\n");

  // ==================== CONFIGURATION ====================
  const FACTORY_ADDRESS = "0x2aDD379F855d69cE02CB9EEdBa25b29F683A2008"; // Monad testnet factory
  
  // Token Configuration
  const TOKEN_NAME = "testoketne";
  const TOKEN_SYMBOL = "test";
  const NFT_COLLECTION = "0x800f8CACc990DdA9f4b3F1386C84983fFb65Ce94";
  const COLLECTION_OWNER = "0x6756Fd803CC084d4B48689e69b0Ab85003740a65";
  const ROYALTY_RECIPIENT = "0x42d4B976526035d682fF29BC791081e807aFdcD6"; // Separate royalty recipient
  const ROYALTY_PERCENTAGE = 3; // 3%
  
  // Convert percentage to basis points (3% = 300 basis points)
  const ROYALTY_BPS = ROYALTY_PERCENTAGE * 100;
  
  console.log("📋 Deployment Configuration:");
  console.log("───────────────────────────────────────");
  console.log("Token Name:", TOKEN_NAME);
  console.log("Token Symbol:", TOKEN_SYMBOL);
  console.log("NFT Collection:", NFT_COLLECTION);
  console.log("Collection Owner:", COLLECTION_OWNER);
  console.log("Royalty Recipient:", ROYALTY_RECIPIENT);
  console.log("Royalty Percentage:", ROYALTY_PERCENTAGE + "%");
  console.log("Royalty BPS:", ROYALTY_BPS);
  console.log("Factory Address:", FACTORY_ADDRESS);
  console.log("───────────────────────────────────────\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying from account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());
  console.log("───────────────────────────────────────\n");

  // Connect to factory contract
  console.log("🏭 Connecting to Factory...");
  const factory = await ethers.getContractAt("UpFloorStrategyFactory", FACTORY_ADDRESS);
  
  // Get deployment fee
  const deploymentFee = await factory.getDeploymentFee();
  console.log("💵 Deployment fee required:", ethers.formatEther(deploymentFee), "ETH\n");

  // Check if deployer has enough balance
  if (balance < deploymentFee) {
    console.error("❌ Error: Insufficient balance for deployment fee");
    console.error("Required:", ethers.formatEther(deploymentFee), "ETH");
    console.error("Available:", ethers.formatEther(balance), "ETH");
    process.exit(1);
  }

  // Deploy token through factory
  console.log("📦 Deploying token through factory...");
  console.log("⏳ This may take a moment...\n");
  
  const tx = await factory.deployStrategyToken(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    NFT_COLLECTION,
    COLLECTION_OWNER,
    ROYALTY_RECIPIENT,
    ROYALTY_BPS,
    { value: deploymentFee }
  );

  console.log("📝 Transaction hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...\n");

  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed!");
  console.log("📦 Block number:", receipt.blockNumber);
  console.log("⛽ Gas used:", receipt.gasUsed.toString());
  console.log("───────────────────────────────────────\n");

  // Extract deployment addresses from event
  const event = receipt.logs.find(log => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed.name === "TokenDeployed";
    } catch (e) {
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

  console.log("🎉 Token Deployment Successful!");
  console.log("───────────────────────────────────────");
  console.log("Token Address:", tokenAddress);
  console.log("Router Address:", routerAddress);
  console.log("Strategy Address:", strategyAddress);
  console.log("───────────────────────────────────────\n");

  // Verify deployed token configuration
  console.log("🔍 Verifying token configuration...");
  const token = await ethers.getContractAt("UpFloorToken", tokenAddress);
  
  const tokenName = await token.name();
  const tokenSymbol = await token.symbol();
  const collectionAddr = await token.getCollectionAddress();
  const royaltyAddr = await token.getCollectionOwnerAddress();
  const royaltyBps = await token.getCollectionRoyaltyBps();
  const tokenOwner = await token.owner();
  const rewardPercentage = await token.getRewardPercentage();

  console.log("✅ Token Configuration Verified:");
  console.log("───────────────────────────────────────");
  console.log("Name:", tokenName);
  console.log("Symbol:", tokenSymbol);
  console.log("Collection:", collectionAddr);
  console.log("Royalty Recipient:", royaltyAddr);
  console.log("Royalty BPS:", royaltyBps.toString(), "(" + (Number(royaltyBps) / 100) + "%)");
  console.log("Reward Percentage:", (Number(rewardPercentage) / 100) + "%");
  console.log("Owner:", tokenOwner);
  console.log("───────────────────────────────────────\n");

  // Save deployment data
  const deploymentData = {
    network: network.name,
    chainId: network.chainId.toString(),
    factoryAddress: FACTORY_ADDRESS,
    token: {
      address: tokenAddress,
      name: tokenName,
      symbol: tokenSymbol,
      owner: tokenOwner
    },
    router: {
      address: routerAddress
    },
    strategy: {
      address: strategyAddress
    },
    configuration: {
      nftCollection: collectionAddr,
      royaltyRecipient: royaltyAddr,
      royaltyBps: royaltyBps.toString(),
      royaltyPercentage: (Number(royaltyBps) / 100) + "%",
      rewardPercentage: (Number(rewardPercentage) / 100) + "%"
    },
    deployment: {
      deployer: deployer.address,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      deploymentFee: ethers.formatEther(deploymentFee),
      timestamp: new Date().toISOString()
    }
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentDir = path.join(__dirname, "..", "deploymentData");
  
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  const filename = `${TOKEN_SYMBOL}-${network.name}-deployment-${Date.now()}.json`;
  const filepath = path.join(deploymentDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  console.log("📄 Deployment data saved to:", filename);
  console.log("\n✨ Deployment completed successfully!");

  // Print quick reference
  console.log("\n📌 Quick Reference:");
  console.log("───────────────────────────────────────");
  console.log("Token:", tokenAddress);
  console.log("Router:", routerAddress);
  console.log("Strategy:", strategyAddress);
  console.log("───────────────────────────────────────");

  return {
    tokenAddress,
    routerAddress,
    strategyAddress,
    txHash: tx.hash
  };
}

// Execute deployment
main()
  .then((result) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

