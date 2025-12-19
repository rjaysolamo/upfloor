const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting token deployment on Taiko Alethia...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying from account:", deployer.address);
  
  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());
  console.log("───────────────────────────────────────\n");

  // Factory address from previous deployment
  const FACTORY_ADDRESS = "0x9ea42D6D3f10F3244c26efC6A210e7ddcb3498eE";
  
  // Token parameters
  const TOKEN_NAME = "TaikoTestToken";
  const TOKEN_SYMBOL = "TTT";
  const NFT_COLLECTION = "0x77D64eca9eDe120280E9Ffe19990F0CaF4bB45dA";
  const COLLECTION_OWNER = "0x42d4B976526035d682fF29BC791081e807aFdcD6";
  const ROYALTY_RECIPIENT = "0x42d4B976526035d682fF29BC791081e807aFdcD6";
  const ROYALTY_BPS = 300; // 3%

  console.log("📋 Deployment Parameters:");
  console.log("Token Name:", TOKEN_NAME);
  console.log("Token Symbol:", TOKEN_SYMBOL);
  console.log("NFT Collection:", NFT_COLLECTION);
  console.log("Collection Owner:", COLLECTION_OWNER);
  console.log("Royalty Recipient:", ROYALTY_RECIPIENT);
  console.log("Royalty BPS:", ROYALTY_BPS, "(3%)");
  console.log("───────────────────────────────────────\n");

  // Connect to factory
  const factory = await ethers.getContractAt("UpFloorStrategyFactory", FACTORY_ADDRESS);
  
  // Get deployment fee
  const deploymentFee = await factory.getDeploymentFee();
  console.log("💵 Required deployment fee:", ethers.formatEther(deploymentFee), "ETH");
  
  // Estimate gas cost for deployment
  console.log("⛽ Estimating gas costs...");
  const gasEstimate = await factory.deployStrategyToken.estimateGas(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    NFT_COLLECTION,
    COLLECTION_OWNER,
    ROYALTY_RECIPIENT,
    ROYALTY_BPS,
    { value: deploymentFee }
  );
  
  // Get current gas price
  const gasPrice = await ethers.provider.getFeeData();
  const gasCost = gasEstimate * gasPrice.gasPrice;
  
  console.log("⛽ Estimated gas:", gasEstimate.toString());
  console.log("⛽ Gas price:", ethers.formatUnits(gasPrice.gasPrice, "gwei"), "gwei");
  console.log("⛽ Estimated gas cost:", ethers.formatEther(gasCost), "ETH");
  
  // Calculate total cost
  const totalCost = deploymentFee + gasCost;
  console.log("💰 Total estimated cost:", ethers.formatEther(totalCost), "ETH");
  console.log("───────────────────────────────────────");
  
  // Check if we have enough balance
  if (balance < totalCost) {
    console.error("❌ Insufficient balance!");
    console.error("   Current balance:", ethers.formatEther(balance), "ETH");
    console.error("   Required total:", ethers.formatEther(totalCost), "ETH");
    console.error("   Shortfall:", ethers.formatEther(totalCost - balance), "ETH");
    process.exit(1);
  }
  
  console.log("✅ Sufficient balance for deployment");
  console.log("───────────────────────────────────────\n");

  console.log("📦 Deploying token through factory...");
  
  // Deploy token
  const tx = await factory.deployStrategyToken(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    NFT_COLLECTION,
    COLLECTION_OWNER,
    ROYALTY_RECIPIENT,
    ROYALTY_BPS,
    { value: deploymentFee }
  );
  
  console.log("⏳ Transaction hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
  
  // Parse events to get deployed addresses
  const tokenDeployedEvent = receipt.logs.find(log => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed.name === "TokenDeployed";
    } catch (e) {
      return false;
    }
  });
  
  if (tokenDeployedEvent) {
    const parsed = factory.interface.parseLog(tokenDeployedEvent);
    const tokenAddress = parsed.args.token;
    const routerAddress = parsed.args.router;
    const strategyAddress = parsed.args.strategy;
    
    console.log("\n🎉 Deployment Summary:");
    console.log("───────────────────────────────────────");
    console.log("Token Address:", tokenAddress);
    console.log("Router Address:", routerAddress);
    console.log("Strategy Address:", strategyAddress);
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId.toString());
    console.log("Deployment Fee:", ethers.formatEther(deploymentFee), "ETH");
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("Gas Price:", ethers.formatUnits(receipt.gasPrice, "gwei"), "gwei");
    console.log("───────────────────────────────────────\n");

    // Save deployment data
    const deploymentData = {
      network: network.name,
      chainId: network.chainId.toString(),
      factoryAddress: FACTORY_ADDRESS,
      tokenAddress: tokenAddress,
      routerAddress: routerAddress,
      strategyAddress: strategyAddress,
      tokenName: TOKEN_NAME,
      tokenSymbol: TOKEN_SYMBOL,
      nftCollection: NFT_COLLECTION,
      collectionOwner: COLLECTION_OWNER,
      royaltyRecipient: ROYALTY_RECIPIENT,
      royaltyBps: ROYALTY_BPS,
      deploymentFee: ethers.formatEther(deploymentFee),
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: receipt.gasPrice.toString()
    };

    const fs = require("fs");
    const path = require("path");
    const deploymentDir = path.join(__dirname, "..", "deploymentData");
    
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    const filename = `taikoalethia-token-deployment-${Date.now()}.json`;
    const filepath = path.join(deploymentDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
    console.log("📄 Deployment data saved to:", filename);

    return {
      tokenAddress,
      routerAddress,
      strategyAddress,
      deploymentFee: ethers.formatEther(deploymentFee),
      network: network.name,
      chainId: network.chainId.toString()
    };
  } else {
    console.error("❌ Could not find TokenDeployed event");
    process.exit(1);
  }
}

// Execute deployment
main()
  .then((result) => {
    console.log("\n✨ Token deployment completed successfully!");
    console.log("🔗 View on TaikoScan:", `https://taikoscan.io/address/${result.tokenAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
