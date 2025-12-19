const { ethers } = require("hardhat");

async function main() {
  console.log("🔥 UpFloor Token Burn Tracker\n");

  // Configuration
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "0xdb75786A4CdBbb01e4A00b78e2e7B50Fb269F676";
  
  if (TOKEN_ADDRESS === "0x...") {
    console.log("❌ Please set TOKEN_ADDRESS environment variable");
    console.log("   Example: TOKEN_ADDRESS=0x1234... npm run check-burned");
    process.exit(1);
  }

  try {
    // Connect to the token contract
    const UpFloorToken = await ethers.getContractFactory("UpFloorToken");
    const token = UpFloorToken.attach(TOKEN_ADDRESS);

    console.log("📊 Token Supply Analysis");
    console.log("=" .repeat(50));
    console.log(`Token Address: ${TOKEN_ADDRESS}\n`);

    // Get all supply data
    const totalSupply = await token.totalSupply();
    const effectiveSupply = await token.effectiveSupply();
    const burnedTokens = await token.lockedSupply();
    
    // Calculate percentages
    const burnedPercentage = totalSupply > 0 ? (Number(burnedTokens) / Number(totalSupply)) * 100 : 0;
    const effectivePercentage = totalSupply > 0 ? (Number(effectiveSupply) / Number(totalSupply)) * 100 : 0;

    // Display results
    console.log("📈 Supply Breakdown:");
    console.log(`   Total Supply:    ${ethers.formatEther(totalSupply).padStart(15)} tokens (100.00%)`);
    console.log(`   Effective Supply: ${ethers.formatEther(effectiveSupply).padStart(15)} tokens (${effectivePercentage.toFixed(2)}%)`);
    console.log(`   Burned Tokens:   ${ethers.formatEther(burnedTokens).padStart(15)} tokens (${burnedPercentage.toFixed(2)}%)`);
    
    console.log("\n🔥 Burn Analysis:");
    if (Number(burnedTokens) === 0) {
      console.log("   ✅ No tokens have been burned yet");
    } else {
      console.log(`   🔥 Total burned: ${ethers.formatEther(burnedTokens)} tokens`);
      console.log(`   📊 Burn rate: ${burnedPercentage.toFixed(2)}% of total supply`);
      
      // Show burn impact
      if (burnedPercentage > 10) {
        console.log("   🎯 High burn rate - significant deflationary pressure");
      } else if (burnedPercentage > 5) {
        console.log("   📈 Moderate burn rate - healthy deflation");
      } else {
        console.log("   📉 Low burn rate - minimal deflation so far");
      }
    }

    // Check DEAD_ADDRESS balance directly
    const deadAddress = "0x000000000000000000000000000000000000dEaD";
    const deadBalance = await token.balanceOf(deadAddress);
    
    console.log("\n💀 DEAD_ADDRESS Analysis:");
    console.log(`   DEAD_ADDRESS: ${deadAddress}`);
    console.log(`   Balance: ${ethers.formatEther(deadBalance)} tokens`);
    
    if (Number(deadBalance) === Number(burnedTokens)) {
      console.log("   ✅ DEAD_ADDRESS balance matches lockedSupply()");
    } else {
      console.log("   ⚠️  Mismatch detected - investigate further");
    }

    // Show how tokens get burned
    console.log("\n🔧 How Tokens Get Burned:");
    console.log("   1. lock() function - transfers tokens to DEAD_ADDRESS");
    console.log("   2. transferContractTokens() - owner can burn tokens");
    console.log("   3. Any transfer to DEAD_ADDRESS = burned");

    // Show recent burn events (if any)
    console.log("\n📋 Burn Tracking Methods:");
    console.log("   • lockedSupply() - total burned tokens");
    console.log("   • effectiveSupply() - circulating supply");
    console.log("   • balanceOf(DEAD_ADDRESS) - direct check");
    console.log("   • Lock events - track individual burns");

  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("call revert exception")) {
      console.log("   💡 Check if the token address is correct");
    }
  }
}

// Helper function to show burn history
async function showBurnHistory() {
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
  
  if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "0x...") {
    console.log("❌ Please set TOKEN_ADDRESS environment variable");
    return;
  }

  try {
    const UpFloorToken = await ethers.getContractFactory("UpFloorToken");
    const token = UpFloorToken.attach(TOKEN_ADDRESS);

    console.log("📜 Burn Event History");
    console.log("=" .repeat(50));
    
    // Get Lock events (these represent burns)
    const filter = token.filters.Lock();
    const events = await token.queryFilter(filter);
    
    if (events.length === 0) {
      console.log("   No burn events found");
      return;
    }

    let totalBurned = BigInt(0);
    
    console.log(`   Found ${events.length} burn events:\n`);
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { by, from, tokens } = event.args;
      totalBurned += BigInt(tokens);
      
      console.log(`   Event ${i + 1}:`);
      console.log(`     Burned by: ${by}`);
      console.log(`     From: ${from}`);
      console.log(`     Amount: ${ethers.formatEther(tokens)} tokens`);
      console.log(`     Block: ${event.blockNumber}`);
      console.log(`     TX: ${event.transactionHash}\n`);
    }
    
    console.log(`   Total burned from events: ${ethers.formatEther(totalBurned)} tokens`);
    
    // Verify against current locked supply
    const currentLocked = await token.lockedSupply();
    if (Number(totalBurned) === Number(currentLocked)) {
      console.log("   ✅ Event total matches current locked supply");
    } else {
      console.log("   ⚠️  Event total differs from current locked supply");
      console.log(`   Current locked: ${ethers.formatEther(currentLocked)} tokens`);
    }

  } catch (error) {
    console.error("❌ Error reading burn history:", error.message);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes("--history") || args.includes("-h")) {
  showBurnHistory().then(() => process.exit(0));
} else {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}
