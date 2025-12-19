const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 UpFloor Token Reward Management Script\n");

  // Get signers
  const [owner, user1] = await ethers.getSigners();
  console.log("👤 Owner:", owner.address);
  console.log("💰 Owner balance:", ethers.formatEther(await ethers.provider.getBalance(owner.address)), "ETH\n");

  // Configuration
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "0x..."; // Replace with your token address
  const NEW_REWARD_PERCENTAGE = process.env.REWARD_PERCENTAGE || 200; // 2% (200 basis points)

  if (TOKEN_ADDRESS === "0x...") {
    console.log("❌ Please set TOKEN_ADDRESS environment variable or update the script");
    console.log("   Example: TOKEN_ADDRESS=0x1234... npm run set-reward");
    process.exit(1);
  }

  console.log("📋 Configuration:");
  console.log(`   Token Address: ${TOKEN_ADDRESS}`);
  console.log(`   New Reward %: ${NEW_REWARD_PERCENTAGE} basis points (${NEW_REWARD_PERCENTAGE/100}%)\n`);

  try {
    // Connect to the token contract
    const UpFloorToken = await ethers.getContractFactory("UpFloorToken");
    const token = UpFloorToken.attach(TOKEN_ADDRESS);

    // Check current reward percentage
    console.log("📊 Current Status:");
    const currentPercentage = await token.getRewardPercentage();
    console.log(`   Current Reward %: ${currentPercentage} basis points (${Number(currentPercentage)/100}%)`);
    
    const maxPercentage = await token.MAX_REWARD_PERCENTAGE();
    console.log(`   Max Allowed %: ${maxPercentage} basis points (${Number(maxPercentage)/100}%)`);

    // Validate new percentage
    if (Number(NEW_REWARD_PERCENTAGE) > Number(maxPercentage)) {
      console.log(`\n❌ Error: New percentage (${NEW_REWARD_PERCENTAGE}) exceeds maximum allowed (${maxPercentage})`);
      process.exit(1);
    }

    if (Number(NEW_REWARD_PERCENTAGE) === Number(currentPercentage)) {
      console.log(`\n✅ Reward percentage is already set to ${NEW_REWARD_PERCENTAGE} basis points`);
      process.exit(0);
    }

    console.log(`\n🔄 Updating reward percentage from ${currentPercentage} to ${NEW_REWARD_PERCENTAGE} basis points...`);

    // Estimate gas
    const gasEstimate = await token.setRewardPercentage.estimateGas(NEW_REWARD_PERCENTAGE);
    console.log(`   Gas Estimate: ${gasEstimate.toString()}`);

    // Set new reward percentage
    const tx = await token.setRewardPercentage(NEW_REWARD_PERCENTAGE);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log("   Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);

    // Verify the change
    const newPercentage = await token.getRewardPercentage();
    console.log(`\n✅ Success! New reward percentage: ${newPercentage} basis points (${Number(newPercentage)/100}%)`);

    // Show example of how rewards work
    console.log("\n💡 How Rewards Work:");
    console.log("   • Anyone can call executeExternalCall()");
    console.log("   • Rewards are paid to non-owner addresses");
    console.log("   • Reward amount = (ETH value × reward %) ÷ 10000");
    console.log(`   • Example: 1 ETH call = ${Number(newPercentage)/100} ETH reward`);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("InvalidRewardPercentage")) {
      console.log("   💡 The reward percentage exceeds the maximum allowed (10%)");
    } else if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("   💡 Only the contract owner can set reward percentage");
    } else if (error.message.includes("call revert exception")) {
      console.log("   💡 Check if the token address is correct and you're the owner");
    }
    
    process.exit(1);
  }
}

// Helper function to show current reward settings
async function showCurrentSettings() {
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
  
  if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "0x...") {
    console.log("❌ Please set TOKEN_ADDRESS environment variable");
    return;
  }

  try {
    const UpFloorToken = await ethers.getContractFactory("UpFloorToken");
    const token = UpFloorToken.attach(TOKEN_ADDRESS);

    console.log("📊 Current Reward Settings:");
    console.log(`   Token Address: ${TOKEN_ADDRESS}`);
    
    const currentPercentage = await token.getRewardPercentage();
    console.log(`   Current Reward %: ${currentPercentage} basis points (${Number(currentPercentage)/100}%)`);
    
    const maxPercentage = await token.MAX_REWARD_PERCENTAGE();
    console.log(`   Max Allowed %: ${maxPercentage} basis points (${Number(maxPercentage)/100}%)`);
    
    const owner = await token.owner();
    console.log(`   Contract Owner: ${owner}`);

  } catch (error) {
    console.error("❌ Error reading settings:", error.message);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes("--show") || args.includes("-s")) {
  showCurrentSettings().then(() => process.exit(0));
} else {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}
