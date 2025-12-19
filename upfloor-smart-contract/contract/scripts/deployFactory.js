const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting UpFloorStrategyFactory deployment...\n");

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

  // Deploy UpFloorStrategyFactory
  console.log("📦 Deploying UpFloorStrategyFactory...");
  const UpFloorStrategyFactory = await ethers.getContractFactory("UpFloorStrategyFactory");
  const factory = await UpFloorStrategyFactory.deploy();
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log("✅ UpFloorStrategyFactory deployed to:", factoryAddress);
  
  // Get deployment fee that was set based on chain ID
  const deploymentFee = await factory.getDeploymentFee();
  console.log("💵 Deployment fee set to:", ethers.formatEther(deploymentFee), "ETH");
  
  // Get factory owner
  const owner = await factory.owner();
  console.log("👤 Factory owner:", owner);
  
  console.log("\n───────────────────────────────────────");
  console.log("🎉 Deployment Summary:");
  console.log("───────────────────────────────────────");
  console.log("Factory Address:", factoryAddress);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployment Fee:", ethers.formatEther(deploymentFee), "ETH");
  console.log("Owner:", owner);
  console.log("───────────────────────────────────────\n");

  // Save deployment data
  const deploymentData = {
    network: network.name,
    chainId: network.chainId.toString(),
    factoryAddress: factoryAddress,
    deploymentFee: ethers.formatEther(deploymentFee),
    owner: owner,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentDir = path.join(__dirname, "..", "deploymentData");
  
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  const filename = `${network.name}-factory-deployment-${Date.now()}.json`;
  const filepath = path.join(deploymentDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  console.log("📄 Deployment data saved to:", filename);

  return {
    factoryAddress,
    deploymentFee: ethers.formatEther(deploymentFee),
    network: network.name,
    chainId: network.chainId.toString()
  };
}

// Execute deployment
main()
  .then((result) => {
    console.log("\n✨ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

