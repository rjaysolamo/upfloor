const { ethers } = require("hardhat");

// Contract addresses
const TOKEN_CONTRACT = "0xA46DD94c18D242859602f83115d33274aC20aEc2";
const TAIKO_MARKETPLACE = "0x89aFa165F40f2210c99e87E706C0160503E12F1c";

// Example NFT purchase data
const LISTING_ID = 7027; // Ceppi Gene #155 for 5 TAIKO

// Minimal ABIs
const TOKEN_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "target", "type": "address"},
      {"internalType": "uint256", "name": "value", "type": "uint256"},
      {"internalType": "bytes", "name": "data", "type": "bytes"}
    ],
    "name": "executeExternalCall",
    "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approveTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const MARKETPLACE_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "listingId", "type": "uint256"}],
    "name": "buyNFT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function executeExternalCallExample() {
  console.log("🚀 Simple executeExternalCall Example");
  console.log("=====================================");
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // Connect to token contract
  const tokenContract = new ethers.Contract(TOKEN_CONTRACT, TOKEN_ABI, signer);
  
  // Step 1: Approve TAIKO tokens for marketplace (5 TAIKO)
  console.log("\n1️⃣ Approving TAIKO tokens...");
  const approveAmount = ethers.parseEther("5.0");
  const approveTx = await tokenContract.approveTokens(TAIKO_MARKETPLACE, approveAmount);
  console.log("Approve tx:", approveTx.hash);
  await approveTx.wait();
  console.log("✅ Approved 5 TAIKO for marketplace");
  
  // Step 2: Encode the buyNFT function call
  console.log("\n2️⃣ Encoding buyNFT function call...");
  const marketplaceInterface = new ethers.Interface(MARKETPLACE_ABI);
  const buyNFTData = marketplaceInterface.encodeFunctionData("buyNFT", [LISTING_ID]);
  console.log("Encoded data:", buyNFTData);
  
  // Step 3: Execute the external call
  console.log("\n3️⃣ Executing external call...");
  console.log("Parameters:");
  console.log("  - target:", TAIKO_MARKETPLACE);
  console.log("  - value: 0 (paying with TAIKO tokens, not ETH)");
  console.log("  - data:", buyNFTData);
  
  const executeTx = await tokenContract.executeExternalCall(
    TAIKO_MARKETPLACE,  // target: marketplace contract
    0,                  // value: 0 ETH (we're using TAIKO tokens)
    buyNFTData,         // data: encoded buyNFT(listingId) call
    { gasLimit: 1000000 }
  );
  
  console.log("Execute tx:", executeTx.hash);
  const receipt = await executeTx.wait();
  console.log("✅ External call executed successfully!");
  console.log("Gas used:", receipt.gasUsed.toString());
  
  return {
    approveHash: approveTx.hash,
    executeHash: executeTx.hash,
    gasUsed: receipt.gasUsed.toString()
  };
}

// Alternative: Direct function call example
async function directFunctionCallExample() {
  console.log("\n🔧 Alternative: Direct Function Call");
  console.log("===================================");
  
  const [signer] = await ethers.getSigners();
  
  // This is what executeExternalCall does internally:
  const marketplaceContract = new ethers.Contract(TAIKO_MARKETPLACE, MARKETPLACE_ABI, signer);
  
  console.log("Direct call equivalent:");
  console.log("await marketplaceContract.buyNFT(" + LISTING_ID + ")");
  
  // Note: This would fail because the marketplace expects TAIKO payment from token contract
  // That's why we use executeExternalCall - it calls from the token contract's context
}

async function main() {
  try {
    const result = await executeExternalCallExample();
    
    console.log("\n🎉 Success Summary:");
    console.log("Approve transaction:", result.approveHash);
    console.log("Execute transaction:", result.executeHash);
    console.log("Total gas used:", result.gasUsed);
    
    await directFunctionCallExample();
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);