const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Calculating deployment costs on Taiko Alethia...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Account:", deployer.address);
  
  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Current balance:", ethers.formatEther(balance), "ETH\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());
  console.log("───────────────────────────────────────\n");

  // Factory address
  const FACTORY_ADDRESS = "0x9ea42D6D3f10F3244c26efC6A210e7ddcb3498eE";
  
  // Connect to factory
  const factory = await ethers.getContractAt("UpFloorStrategyFactory", FACTORY_ADDRESS);
  
  // Get deployment fee
  const deploymentFee = await factory.getDeploymentFee();
  console.log("💵 Deployment fee:", ethers.formatEther(deploymentFee), "ETH");
  
  // Get current gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("⛽ Current gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  
  // Estimate gas costs based on typical deployment
  // Token deployment typically uses 2-4M gas
  const estimatedGas = 3000000n; // 3M gas estimate
  const gasCost = estimatedGas * feeData.gasPrice;
  
  console.log("⛽ Estimated gas usage:", estimatedGas.toString(), "gas");
  console.log("⛽ Estimated gas cost:", ethers.formatEther(gasCost), "ETH");
  
  // Calculate total cost
  const totalCost = deploymentFee + gasCost;
  console.log("───────────────────────────────────────");
  console.log("💰 TOTAL ESTIMATED COST:", ethers.formatEther(totalCost), "ETH");
  console.log("───────────────────────────────────────");
  
  // Check if we have enough balance
  if (balance < totalCost) {
    const shortfall = totalCost - balance;
    console.log("❌ INSUFFICIENT BALANCE");
    console.log("   Current balance:", ethers.formatEther(balance), "ETH");
    console.log("   Required total:", ethers.formatEther(totalCost), "ETH");
    console.log("   Shortfall:", ethers.formatEther(shortfall), "ETH");
    console.log("   Need to add:", ethers.formatEther(shortfall), "ETH more");
  } else {
    const remaining = balance - totalCost;
    console.log("✅ SUFFICIENT BALANCE");
    console.log("   Current balance:", ethers.formatEther(balance), "ETH");
    console.log("   Required total:", ethers.formatEther(totalCost), "ETH");
    console.log("   Remaining after deployment:", ethers.formatEther(remaining), "ETH");
  }
  
  console.log("───────────────────────────────────────");
  console.log("📊 Cost Breakdown:");
  console.log("   • Deployment fee (protocol):", ethers.formatEther(deploymentFee), "ETH");
  console.log("   • Gas cost (network):", ethers.formatEther(gasCost), "ETH");
  console.log("   • Total:", ethers.formatEther(totalCost), "ETH");
  
  // USD estimate (assuming ETH = $2500)
  const ethPrice = 2500;
  const totalUSD = parseFloat(ethers.formatEther(totalCost)) * ethPrice;
  console.log("   • USD estimate (ETH=$2500):", `$${totalUSD.toFixed(2)}`);
  console.log("───────────────────────────────────────\n");
}

main()
  .then(() => {
    console.log("✨ Cost calculation completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Calculation failed:");
    console.error(error);
    process.exit(1);
  });
