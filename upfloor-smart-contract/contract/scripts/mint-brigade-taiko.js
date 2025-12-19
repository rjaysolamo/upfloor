const { ethers } = require("hardhat");
const fs = require("fs");

// Load deployment data
const deploymentPath = "./deploymentData/taiko-brigade-deployment-1761792600638.json";
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const TOKEN_ADDRESS = deployment.contracts.token;
const TAIKO_TOKEN_ADDRESS = deployment.taiko.paymentToken;
const TOKENS_TO_MINT = "1"; // Amount of Brigade tokens to mint

async function main() {
  console.log("\n🪙 Minting BrigadeAssets Tokens with TAIKO...\n");

  const [minter] = await ethers.getSigners();
  console.log("Minter account:", minter.address);

  // Connect to contracts
  const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
  const taiko = await ethers.getContractAt(
    ["function approve(address,uint256) returns(bool)", 
     "function balanceOf(address) view returns(uint256)", 
     "function allowance(address,address) view returns(uint256)"],
    TAIKO_TOKEN_ADDRESS
  );

  // Check TAIKO balance
  const taikoBalance = await taiko.balanceOf(minter.address);
  console.log("TAIKO balance:", ethers.formatEther(taikoBalance), "TAIKO\n");

  if (taikoBalance === 0n) {
    console.log("❌ You need TAIKO tokens to mint!");
    return;
  }

  const tokensToMint = ethers.parseEther(TOKENS_TO_MINT);
  
  console.log("💰 Mint Details:");
  console.log("  Tokens to mint:", TOKENS_TO_MINT, "BRIGADE");
  console.log("  Token Contract:", TOKEN_ADDRESS);
  console.log("  TAIKO Token:", TAIKO_TOKEN_ADDRESS);

  // Preview mint price
  console.log("\n📊 Previewing mint...");
  const mintPrice = await token.previewMint(tokensToMint);
  console.log("  Price:", ethers.formatEther(mintPrice), "TAIKO");

  if (taikoBalance < mintPrice) {
    console.log("\n❌ Insufficient TAIKO balance!");
    console.log("  Need:", ethers.formatEther(mintPrice), "TAIKO");
    console.log("  Have:", ethers.formatEther(taikoBalance), "TAIKO");
    return;
  }

  // Check current supply
  const currentSupply = await token.totalSupply();
  console.log("  Current supply:", ethers.formatEther(currentSupply), "BRIGADE");

  // Check and approve TAIKO
  const currentAllowance = await taiko.allowance(minter.address, TOKEN_ADDRESS);
  console.log("\n🔐 Checking allowance...");
  console.log("  Current allowance:", ethers.formatEther(currentAllowance), "TAIKO");

  if (currentAllowance < mintPrice) {
    console.log("\n📝 Approving TAIKO...");
    const approveTx = await taiko.approve(TOKEN_ADDRESS, mintPrice);
    console.log("  Transaction hash:", approveTx.hash);
    await approveTx.wait();
    console.log("  ✅ Approved!");
  } else {
    console.log("  ✅ Already approved");
  }

  // Mint tokens
  console.log("\n📝 Minting tokens with TAIKO...");
  try {
    const mintTx = await token.mintWithTaiko(tokensToMint, minter.address, { 
      gasLimit: 500000 
    });
    console.log("  Transaction hash:", mintTx.hash);
    const receipt = await mintTx.wait();
    console.log("  ✅ Tokens minted successfully!");

    // Get minted amount from event
    const mintEvent = receipt.logs.find(log => {
      try {
        const parsed = token.interface.parseLog(log);
        return parsed?.name === "Mint";
      } catch {
        return false;
      }
    });

    if (mintEvent) {
      const parsedEvent = token.interface.parseLog(mintEvent);
      const tokensMinted = parsedEvent.args.tokens;
      const assetsPaid = parsedEvent.args.assets;
      console.log("\n🎉 Mint Details:");
      console.log("  Tokens minted:", ethers.formatEther(tokensMinted), "BRIGADE");
      console.log("  TAIKO paid:", ethers.formatEther(assetsPaid), "TAIKO");
    }

    // Check new balance
    const newBalance = await token.balanceOf(minter.address);
    console.log("\n💼 Your token balance:", ethers.formatEther(newBalance), "BRIGADE");

    // Check new supply
    const newSupply = await token.totalSupply();
    console.log("📊 New total supply:", ethers.formatEther(newSupply), "BRIGADE");

    // Check for royalty payment
    const royaltyEvents = receipt.logs.filter(log => {
      try {
        const parsed = token.interface.parseLog(log);
        return parsed?.name === "CollectionRoyaltyPaid";
      } catch {
        return false;
      }
    });

    if (royaltyEvents.length > 0) {
      const royaltyEvent = token.interface.parseLog(royaltyEvents[0]);
      console.log("\n👑 Royalty paid:", ethers.formatEther(royaltyEvent.args.amount), "BRIGADE");
      console.log("   Recipient:", royaltyEvent.args.collectionOwner);
    }

  } catch (error) {
    console.error("\n❌ Error minting:");
    console.error(error.message);
    if (error.message.includes("InsufficientETH")) {
      console.log("\n💡 You need more TAIKO tokens");
    } else if (error.message.includes("CapExceeded")) {
      console.log("\n💡 Max supply reached");
    }
    throw error;
  }

  console.log("\n✅ Mint complete!\n");
  console.log("═══════════════════════════════════════════════════");
  console.log("📋 MINT SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log("Token:                 BrigadeAssets (BRIGADE)");
  console.log("Token Contract:        ", TOKEN_ADDRESS);
  console.log("TAIKO Token:           ", TAIKO_TOKEN_ADDRESS);
  console.log("Minter:                ", minter.address);
  console.log("Tokens Minted:         ", TOKENS_TO_MINT, "BRIGADE");
  console.log("═══════════════════════════════════════════════════");
  console.log("\n🔗 View Token on Taikoscan:");
  console.log(`https://taikoscan.io/address/${TOKEN_ADDRESS}`);
  console.log("\n🔗 View Your Wallet:");
  console.log(`https://taikoscan.io/address/${minter.address}`);
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = main;
