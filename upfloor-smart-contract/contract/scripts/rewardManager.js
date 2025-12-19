const { ethers } = require("hardhat");

class RewardManager {
  constructor(tokenAddress, signer) {
    this.tokenAddress = tokenAddress;
    this.signer = signer;
    this.token = null;
  }

  async initialize() {
    const UpFloorToken = await ethers.getContractFactory("UpFloorToken");
    this.token = UpFloorToken.attach(this.tokenAddress);
    console.log(`🔗 Connected to UpFloorToken at: ${this.tokenAddress}`);
  }

  async getCurrentSettings() {
    if (!this.token) await this.initialize();

    const currentPercentage = await this.token.getRewardPercentage();
    const maxPercentage = await this.token.MAX_REWARD_PERCENTAGE();
    const owner = await this.token.owner();
    const contractBalance = await ethers.provider.getBalance(this.tokenAddress);

    return {
      currentPercentage: Number(currentPercentage),
      maxPercentage: Number(maxPercentage),
      owner,
      contractBalance: ethers.formatEther(contractBalance)
    };
  }

  async setRewardPercentage(newPercentage) {
    if (!this.token) await this.initialize();

    const settings = await this.getCurrentSettings();
    
    // Validation
    if (newPercentage > settings.maxPercentage) {
      throw new Error(`Reward percentage (${newPercentage}) exceeds maximum allowed (${settings.maxPercentage})`);
    }

    if (newPercentage === settings.currentPercentage) {
      console.log(`✅ Reward percentage is already set to ${newPercentage} basis points`);
      return;
    }

    console.log(`🔄 Updating reward percentage from ${settings.currentPercentage} to ${newPercentage} basis points...`);

    // Estimate gas
    const gasEstimate = await this.token.setRewardPercentage.estimateGas(newPercentage);
    console.log(`   Gas Estimate: ${gasEstimate.toString()}`);

    // Execute transaction
    const tx = await this.token.setRewardPercentage(newPercentage);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log("   Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);

    return receipt;
  }

  async simulateReward(ethValue, callerAddress) {
    if (!this.token) await this.initialize();

    const settings = await this.getCurrentSettings();
    const owner = await this.token.owner();
    
    const rewardAmount = (BigInt(ethValue) * BigInt(settings.currentPercentage)) / BigInt(10000);
    const wouldReceiveReward = callerAddress.toLowerCase() !== owner.toLowerCase();

    return {
      ethValue: ethers.formatEther(ethValue),
      rewardPercentage: settings.currentPercentage,
      rewardAmount: ethers.formatEther(rewardAmount),
      wouldReceiveReward,
      callerAddress,
      isOwner: !wouldReceiveReward
    };
  }

  async showStatus() {
    const settings = await this.getCurrentSettings();
    
    console.log("\n📊 UpFloor Token Reward Status");
    console.log("=" .repeat(50));
    console.log(`Token Address:     ${this.tokenAddress}`);
    console.log(`Contract Owner:    ${settings.owner}`);
    console.log(`Contract Balance:  ${settings.contractBalance} ETH`);
    console.log(`Current Reward %:  ${settings.currentPercentage} basis points (${settings.currentPercentage/100}%)`);
    console.log(`Max Allowed %:     ${settings.maxPercentage} basis points (${settings.maxPercentage/100}%)`);
    console.log("=" .repeat(50));
  }

  async showRewardExamples() {
    const settings = await this.getCurrentSettings();
    
    console.log("\n💡 Reward Examples (Current Settings)");
    console.log("=" .repeat(50));
    
    const examples = [
      ethers.parseEther("0.1"),   // 0.1 ETH
      ethers.parseEther("1"),     // 1 ETH
      ethers.parseEther("5"),     // 5 ETH
      ethers.parseEther("10")     // 10 ETH
    ];

    for (const ethValue of examples) {
      const rewardAmount = (ethValue * BigInt(settings.currentPercentage)) / BigInt(10000);
      console.log(`${ethers.formatEther(ethValue).padStart(6)} ETH call → ${ethers.formatEther(rewardAmount).padStart(8)} ETH reward`);
    }
    
    console.log("=" .repeat(50));
    console.log("Note: Only non-owner addresses receive rewards");
  }
}

async function main() {
  console.log("🎯 UpFloor Token Reward Manager\n");

  // Get signers
  const [owner, user1] = await ethers.getSigners();
  console.log("👤 Owner:", owner.address);
  console.log("👤 User1:", user1.address);

  // Configuration
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
  
  if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "0x...") {
    console.log("\n❌ Please set TOKEN_ADDRESS environment variable");
    console.log("   Example: TOKEN_ADDRESS=0x1234... npm run reward-manager");
    process.exit(1);
  }

  const manager = new RewardManager(TOKEN_ADDRESS, owner);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "status":
      case "show":
        await manager.showStatus();
        await manager.showRewardExamples();
        break;

      case "set":
        const newPercentage = parseInt(args[1]);
        if (!newPercentage || newPercentage < 0) {
          console.log("❌ Please provide a valid reward percentage");
          console.log("   Example: npm run reward-manager set 200");
          process.exit(1);
        }
        
        await manager.showStatus();
        await manager.setRewardPercentage(newPercentage);
        await manager.showStatus();
        break;

      case "simulate":
        const ethValue = args[1] || "1";
        const caller = args[2] || user1.address;
        
        const simulation = await manager.simulateReward(ethers.parseEther(ethValue), caller);
        
        console.log("\n🎮 Reward Simulation");
        console.log("=" .repeat(50));
        console.log(`Call Value:        ${simulation.ethValue} ETH`);
        console.log(`Caller:           ${simulation.callerAddress}`);
        console.log(`Is Owner:         ${simulation.isOwner ? "Yes" : "No"}`);
        console.log(`Would Get Reward: ${simulation.wouldReceiveReward ? "Yes" : "No"}`);
        console.log(`Reward Amount:    ${simulation.rewardAmount} ETH`);
        console.log("=" .repeat(50));
        break;

      default:
        console.log("📋 Available Commands:");
        console.log("   status  - Show current reward settings");
        console.log("   set <percentage> - Set new reward percentage");
        console.log("   simulate <ethValue> [caller] - Simulate reward calculation");
        console.log("\n💡 Examples:");
        console.log("   npm run reward-manager status");
        console.log("   npm run reward-manager set 200");
        console.log("   npm run reward-manager simulate 1.5");
        console.log("   npm run reward-manager simulate 2.0 0x1234...");
        break;
    }

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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
