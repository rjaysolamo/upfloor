const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Minting with account:", signer.address);

  // Load deployment data
  const deploymentPath = "./deploymentData/taiko-brigade-deployment-1761792600638.json";
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const tokenAddress = deployment.contracts.token;
  const routerAddress = deployment.contracts.router;
  const taikoAddress = deployment.taiko.paymentToken;

  console.log("\n=== Deployment Info ===");
  console.log("Brigade Token:", tokenAddress);
  console.log("Router:", routerAddress);
  console.log("Taiko Token:", taikoAddress);

  // Load ABIs
  const tokenABI = [
    "function balanceOf(address) view returns(uint256)",
    "function previewMint(uint256) view returns(uint256)",
    "function mintWithTaiko(uint256,address)"
  ];

  const token = new hre.ethers.Contract(tokenAddress, tokenABI, signer);
  const taiko = new hre.ethers.Contract(taikoAddress, ["function approve(address,uint256) returns(bool)", "function balanceOf(address) view returns(uint256)", "function allowance(address,address) view returns(uint256)"], signer);

  // Check Taiko balance
  const taikoBalance = await taiko.balanceOf(signer.address);
  console.log("\n=== Your Taiko Balance ===");
  console.log(hre.ethers.formatEther(taikoBalance), "TAIKO");

  if (taikoBalance === 0n) {
    console.log("\n❌ You need TAIKO tokens to mint!");
    return;
  }

  // Get mint price (for 1 token)
  const mintPrice = await token.previewMint(1);
  console.log("\n=== Mint Info ===");
  console.log("Mint Price (for 1 token):", hre.ethers.formatEther(mintPrice), "TAIKO");

  if (taikoBalance < mintPrice) {
    console.log("\n❌ Insufficient TAIKO balance!");
    return;
  }

  // Check allowance
  const currentAllowance = await taiko.allowance(signer.address, tokenAddress);
  console.log("Current Allowance:", hre.ethers.formatEther(currentAllowance), "TAIKO");

  // Approve if needed
  if (currentAllowance < mintPrice) {
    console.log("\n📝 Approving TAIKO...");
    const approveTx = await taiko.approve(tokenAddress, mintPrice);
    console.log("Approval tx:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ Approved!");
  }

  // Mint using TAIKO tokens
  console.log("\n🎨 Minting Brigade token with TAIKO...");
  const mintTx = await token.mintWithTaiko(1, signer.address, { gasLimit: 500000 });
  console.log("Mint tx:", mintTx.hash);
  const receipt = await mintTx.wait();
  console.log("✅ Minted successfully!");

  // Get token balance
  const balance = await token.balanceOf(signer.address);
  console.log("\n=== Your Brigade Tokens ===");
  console.log("Balance:", balance.toString());

  console.log("\n✨ Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
