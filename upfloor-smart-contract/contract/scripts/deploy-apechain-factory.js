const { ethers } = require("hardhat");

async function main() {
  console.log("🐒 Deploying UpFloorStrategyFactory on ApeChain...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const UpFloorStrategyFactory = await ethers.getContractFactory("UpFloorStrategyFactory");
  const factory = await UpFloorStrategyFactory.deploy();

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ Factory deployed to:", factoryAddress);
  console.log("Deployment hash:", factory.deploymentTransaction().hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });