const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 UpFloor Token Reward Management Example\n");

  // Example token address (replace with your actual deployed token address)
  const TOKEN_ADDRESS = "0x..."; // Replace with your token address
  
  if (TOKEN_ADDRESS === "0x...") {
    console.log("❌ Please update TOKEN_ADDRESS in this script with your deployed token address");
    console.log("   You can find this after deploying your contracts");
    process.exit(1);
  }

  // Get signers
  const [owner, user1, user2] = await ethers.getSigners();
  console.log("👥 Accounts:");
  console.log(`   Owner: ${owner.address}`);
  console.log(`   User1: ${user1.address}`);
  console.log(`   User2: ${user2.address}\n`);

  try {
    // Connect to the token contract
    const UpFloorToken = await ethers.getContractFactory("UpFloorToken");
    const token = UpFloorToken.attach(TOKEN_ADDRESS);

    console.log("📊 Current Reward Settings:");
    const currentPercentage = await token.getRewardPercentage();
    const maxPercentage = await token.MAX_REWARD_PERCENTAGE();
    const contractOwner = await token.owner();
    
    console.log(`   Current Reward %: ${currentPercentage} basis points (${Number(currentPercentage)/100}%)`);
    console.log(`   Max Allowed %: ${maxPercentage} basis points (${Number(maxPercentage)/100}%)`);
    console.log(`   Contract Owner: ${contractOwner}`);
    console.log(`   Is Owner: ${contractOwner.toLowerCase() === owner.address.toLowerCase() ? "Yes" : "No"}\n`);

    // Example 1: Show how rewards work
    console.log("💡 How Rewards Work:");
    console.log("   • Anyone can call executeExternalCall()");
    console.log("   • Rewards are paid to non-owner addresses");
    console.log("   • Reward amount = (ETH value × reward %) ÷ 10000");
    console.log(`   • Current rate: ${Number(currentPercentage)/100}% of ETH value\n`);

    // Example 2: Simulate different reward scenarios
    console.log("🎮 Reward Simulation Examples:");
    const testValues = [
      ethers.parseEther("0.1"),  // 0.1 ETH
      ethers.parseEther("1"),    // 1 ETH
      ethers.parseEther("5")     // 5 ETH
    ];

    for (const ethValue of testValues) {
      const rewardAmount = (ethValue * BigInt(currentPercentage)) / BigInt(10000);
      console.log(`   ${ethers.formatEther(ethValue).padStart(4)} ETH call → ${ethers.formatEther(rewardAmount).padStart(6)} ETH reward`);
    }

    // Example 3: Show how to set reward percentage (if owner)
    if (contractOwner.toLowerCase() === owner.address.toLowerCase()) {
      console.log("\n🔧 Owner Functions Available:");
      console.log("   • setRewardPercentage(newPercentage)");
      console.log("   • setSeaportAddress(newAddress)");
      console.log("   • pause() / unpause()");
      console.log("   • transferOwnership(newOwner)");
      
      console.log("\n📝 Example: Setting reward to 2%");
      console.log("   await token.setRewardPercentage(200); // 200 basis points = 2%");
    } else {
      console.log("\n⚠️  You are not the contract owner");
      console.log("   Only the owner can change reward settings");
    }

    // Example 4: Show how to call executeExternalCall
    console.log("\n🚀 How to Use executeExternalCall:");
    console.log("   // Anyone can call this function");
    console.log("   const callData = '0x'; // Empty call data");
    console.log("   const callValue = ethers.parseEther('1'); // 1 ETH");
    console.log("   ");
    console.log("   const result = await token.executeExternalCall(");
    console.log("     strategyAddress, // Target contract");
    console.log("     callValue,       // ETH value");
    console.log("     callData         // Call data");
    console.log("   );");
    console.log("   ");
    console.log("   // Non-owner addresses will receive a reward!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("call revert exception")) {
      console.log("   💡 Check if the token address is correct");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
