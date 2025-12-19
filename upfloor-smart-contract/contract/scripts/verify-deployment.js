const { ethers } = require("hardhat");

async function main() {
  const deployment = require("../deploymentData/taiko-brigade-deployment-1761792600638.json");
  
  console.log("\n🔍 Verifying Taiko Hekla Deployment...\n");
  console.log("Network:", deployment.network);
  console.log("Chain ID:", deployment.chainId);
  console.log("Deployer:", deployment.deployer);
  console.log("\n" + "=".repeat(60) + "\n");

  const provider = ethers.provider;

  // Check NFT Collection
  console.log("📦 NFT Collection:");
  console.log("  Address:", deployment.collection.nftCollection);
  const nftCode = await provider.getCode(deployment.collection.nftCollection);
  console.log("  Status:", nftCode !== "0x" ? "✅ Deployed" : "❌ Not Found");
  console.log("  Name:", deployment.collection.name);
  console.log("  Symbol:", deployment.collection.symbol);
  console.log("  Owner:", deployment.collection.collectionOwner);
  console.log("  Royalty:", deployment.collection.royaltyBps / 100 + "%");
  console.log("");

  // Check Factory
  console.log("🏭 Factory Contract:");
  console.log("  Address:", deployment.contracts.factory);
  const factoryCode = await provider.getCode(deployment.contracts.factory);
  console.log("  Status:", factoryCode !== "0x" ? "✅ Deployed" : "❌ Not Found");
  console.log("");

  // Check Token
  console.log("🪙 UpFloor Token:");
  console.log("  Address:", deployment.contracts.token);
  const tokenCode = await provider.getCode(deployment.contracts.token);
  console.log("  Status:", tokenCode !== "0x" ? "✅ Deployed" : "❌ Not Found");
  
  if (tokenCode !== "0x") {
    const token = await ethers.getContractAt("UpFloorToken", deployment.contracts.token);
    try {
      const name = await token.name();
      const symbol = await token.symbol();
      const totalSupply = await token.totalSupply();
      console.log("  Name:", name);
      console.log("  Symbol:", symbol);
      console.log("  Total Supply:", ethers.formatEther(totalSupply));
    } catch (e) {
      console.log("  ⚠️  Could not read token details");
    }
  }
  console.log("");

  // Check Router
  console.log("🔀 Mint Router:");
  console.log("  Address:", deployment.contracts.router);
  const routerCode = await provider.getCode(deployment.contracts.router);
  console.log("  Status:", routerCode !== "0x" ? "✅ Deployed" : "❌ Not Found");
  console.log("");

  // Check Strategy
  console.log("📊 Strategy Contract:");
  console.log("  Address:", deployment.contracts.strategy);
  const strategyCode = await provider.getCode(deployment.contracts.strategy);
  console.log("  Status:", strategyCode !== "0x" ? "✅ Deployed" : "❌ Not Found");
  
  if (strategyCode !== "0x") {
    const strategy = await ethers.getContractAt("UpFloorStrategy", deployment.contracts.strategy);
    try {
      const token = await strategy.token();
      const nftCollection = await strategy.nftCollection();
      console.log("  Token:", token);
      console.log("  NFT Collection:", nftCollection);
      console.log("  Match:", token.toLowerCase() === deployment.contracts.token.toLowerCase() ? "✅" : "❌");
    } catch (e) {
      console.log("  ⚠️  Could not read strategy details");
    }
  }
  console.log("");

  // Check Taiko Marketplace
  console.log("🏪 Taiko Marketplace:");
  console.log("  Address:", deployment.taiko.marketplace);
  const marketplaceCode = await provider.getCode(deployment.taiko.marketplace);
  console.log("  Status:", marketplaceCode !== "0x" ? "✅ Deployed" : "❌ Not Found");
  console.log("");

  // Check Payment Token (TAIKO)
  console.log("💰 Payment Token (TAIKO):");
  console.log("  Address:", deployment.taiko.paymentToken);
  const paymentCode = await provider.getCode(deployment.taiko.paymentToken);
  console.log("  Status:", paymentCode !== "0x" ? "✅ Deployed" : "❌ Not Found");
  
  if (paymentCode !== "0x") {
    const taiko = await ethers.getContractAt("IERC20", deployment.taiko.paymentToken);
    try {
      const name = await taiko.name();
      const symbol = await taiko.symbol();
      console.log("  Name:", name);
      console.log("  Symbol:", symbol);
    } catch (e) {
      console.log("  ⚠️  Could not read token details");
    }
  }
  console.log("");

  console.log("=".repeat(60));
  console.log("\n✅ Verification Complete!");
  console.log("\n📋 Transaction Hash:", deployment.transactionHash);
  console.log("💵 Deployment Fee:", deployment.deploymentFee, "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
