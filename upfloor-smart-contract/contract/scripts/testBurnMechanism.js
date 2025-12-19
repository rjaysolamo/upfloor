const { ethers } = require("hardhat");

async function main() {
  console.log("🔥 Testing UpFloor Token Burn Mechanism\n");

  // Get signers
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const user1 = signers[1] || signers[0]; // Use owner if no second signer
  const user2 = signers[2] || signers[0]; // Use owner if no third signer
  
  console.log("👥 Test accounts:");
  console.log(`   Owner: ${owner.address}`);
  console.log(`   User1: ${user1.address}`);
  console.log(`   User2: ${user2.address}\n`);

  // Configuration
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "0xdb75786A4CdBbb01e4A00b78e2e7B50Fb269F676";
  
  console.log("📋 Configuration:");
  console.log(`   Token Address: ${TOKEN_ADDRESS}\n`);

  try {
    // Connect to the token contract
    const UpFloorToken = await ethers.getContractFactory("UpFloorToken");
    const token = UpFloorToken.attach(TOKEN_ADDRESS);

    // Check initial state
    console.log("📊 Initial State:");
    const initialTotalSupply = await token.totalSupply();
    const initialBurned = await token.lockedSupply();
    const initialEffective = await token.effectiveSupply();
    
    console.log(`   Total Supply: ${ethers.formatEther(initialTotalSupply)} tokens`);
    console.log(`   Burned Tokens: ${ethers.formatEther(initialBurned)} tokens`);
    console.log(`   Effective Supply: ${ethers.formatEther(initialEffective)} tokens\n`);

    // Check user balances
    const ownerBalance = await token.balanceOf(owner.address);
    const user1Balance = await token.balanceOf(user1.address);
    
    console.log("💰 User Balances:");
    console.log(`   Owner: ${ethers.formatEther(ownerBalance)} tokens`);
    console.log(`   User1: ${ethers.formatEther(user1Balance)} tokens\n`);

    // Test 1: Owner burns tokens using transferContractTokens
    console.log("🔥 Test 1: Owner burns tokens via transferContractTokens");
    
    if (Number(ownerBalance) > 0) {
      const burnAmount = ethers.parseEther("1"); // Burn 1 token
      
      console.log(`   Burning ${ethers.formatEther(burnAmount)} tokens...`);
      
      const tx1 = await token.transferContractTokens(
        "0x000000000000000000000000000000000000dEaD", // DEAD_ADDRESS
        burnAmount
      );
      
      console.log(`   Transaction Hash: ${tx1.hash}`);
      await tx1.wait();
      console.log("   ✅ Tokens burned successfully!");
      
      // Check state after burn
      const afterBurn1 = await token.lockedSupply();
      const afterEffective1 = await token.effectiveSupply();
      
      console.log(`   Burned Tokens: ${ethers.formatEther(afterBurn1)} tokens`);
      console.log(`   Effective Supply: ${ethers.formatEther(afterEffective1)} tokens`);
      console.log(`   Burn Increase: ${ethers.formatEther(afterBurn1 - initialBurned)} tokens\n`);
    } else {
      console.log("   ⚠️  Owner has no tokens to burn\n");
    }

    // Test 2: User burns tokens using lock function
    console.log("🔥 Test 2: User burns tokens via lock function");
    
    if (Number(user1Balance) > 0) {
      const lockAmount = ethers.parseEther("0.5"); // Lock 0.5 tokens
      
      console.log(`   Locking ${ethers.formatEther(lockAmount)} tokens...`);
      
      const tx2 = await token.connect(user1).lock(lockAmount, user1.address);
      
      console.log(`   Transaction Hash: ${tx2.hash}`);
      await tx2.wait();
      console.log("   ✅ Tokens locked/burned successfully!");
      
      // Check state after lock
      const afterLock = await token.lockedSupply();
      const afterEffective2 = await token.effectiveSupply();
      
      console.log(`   Burned Tokens: ${ethers.formatEther(afterLock)} tokens`);
      console.log(`   Effective Supply: ${ethers.formatEther(afterEffective2)} tokens`);
      console.log(`   Total Burned: ${ethers.formatEther(afterLock)} tokens\n`);
    } else {
      console.log("   ⚠️  User1 has no tokens to lock\n");
    }

    // Test 3: Direct transfer to DEAD_ADDRESS
    console.log("🔥 Test 3: Direct transfer to DEAD_ADDRESS");
    
    const currentOwnerBalance = await token.balanceOf(owner.address);
    if (Number(currentOwnerBalance) > 0) {
      const transferAmount = ethers.parseEther("0.1"); // Transfer 0.1 tokens
      
      console.log(`   Transferring ${ethers.formatEther(transferAmount)} tokens to DEAD_ADDRESS...`);
      
      const tx3 = await token.transfer(
        "0x000000000000000000000000000000000000dEaD",
        transferAmount
      );
      
      console.log(`   Transaction Hash: ${tx3.hash}`);
      await tx3.wait();
      console.log("   ✅ Direct transfer to DEAD_ADDRESS successful!");
      
      // Check final state
      const finalBurned = await token.lockedSupply();
      const finalEffective = await token.effectiveSupply();
      const deadBalance = await token.balanceOf("0x000000000000000000000000000000000000dEaD");
      
      console.log(`   Final Burned Tokens: ${ethers.formatEther(finalBurned)} tokens`);
      console.log(`   Final Effective Supply: ${ethers.formatEther(finalEffective)} tokens`);
      console.log(`   DEAD_ADDRESS Balance: ${ethers.formatEther(deadBalance)} tokens\n`);
    } else {
      console.log("   ⚠️  Owner has no tokens to transfer\n");
    }

    // Final verification
    console.log("✅ Final Verification:");
    const finalTotalSupply = await token.totalSupply();
    const finalBurned = await token.lockedSupply();
    const finalEffective = await token.effectiveSupply();
    
    console.log(`   Total Supply: ${ethers.formatEther(finalTotalSupply)} tokens`);
    console.log(`   Burned Tokens: ${ethers.formatEther(finalBurned)} tokens`);
    console.log(`   Effective Supply: ${ethers.formatEther(finalEffective)} tokens`);
    
    // Verify math
    const calculatedEffective = finalTotalSupply - finalBurned;
    if (Number(finalEffective) === Number(calculatedEffective)) {
      console.log("   ✅ Math verification passed: Total - Burned = Effective");
    } else {
      console.log("   ❌ Math verification failed!");
    }
    
    // Check DEAD_ADDRESS balance
    const deadBalance = await token.balanceOf("0x000000000000000000000000000000000000dEaD");
    if (Number(deadBalance) === Number(finalBurned)) {
      console.log("   ✅ DEAD_ADDRESS balance matches lockedSupply()");
    } else {
      console.log("   ❌ DEAD_ADDRESS balance mismatch!");
    }

    console.log("\n🎉 Burn mechanism test completed!");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("InsufficientFunds")) {
      console.log("   💡 Not enough tokens to burn");
    } else if (error.message.includes("InvalidDestination")) {
      console.log("   💡 Cannot transfer to that address");
    } else if (error.message.includes("call revert exception")) {
      console.log("   💡 Check if the token address is correct");
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
