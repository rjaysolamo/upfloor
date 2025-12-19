const { ethers } = require("hardhat");

// HyperEVM Factory Address
const FACTORY_ADDRESS = "0x3F5a6dFd97D6e5d8ef2eA6Dd242d94ae5FDe1e6d";

// New deployment fee (0.026 ETH like Ethereum)
const NEW_DEPLOYMENT_FEE = ethers.parseEther("0.026");

// Factory ABI (minimal)
const FACTORY_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "newFee", "type": "uint256"}],
    "name": "setDeploymentFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDeploymentFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function updateDeploymentFee() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("⚙️  UPDATING HYPEREVM DEPLOYMENT FEE");
  console.log("═══════════════════════════════════════════════════");
  
  const [signer] = await ethers.getSigners();
  console.log("Updating with account:", signer.address);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Factory Address:", FACTORY_ADDRESS);
  
  try {
    // Connect to factory
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
    
    // Check if signer is owner
    const owner = await factory.owner();
    console.log("Factory Owner:", owner);
    console.log("Your Address:", signer.address);
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error("You are not the factory owner!");
    }
    
    // Get current fee
    const currentFee = await factory.getDeploymentFee();
    console.log("\n📊 Fee Update:");
    console.log("Current Fee:", ethers.formatEther(currentFee), "ETH");
    console.log("New Fee:", ethers.formatEther(NEW_DEPLOYMENT_FEE), "ETH");
    
    if (currentFee === NEW_DEPLOYMENT_FEE) {
      console.log("✅ Fee is already set to the target amount!");
      return;
    }
    
    // Update the fee
    console.log("\n🔄 Updating deployment fee...");
    const updateTx = await factory.setDeploymentFee(NEW_DEPLOYMENT_FEE, {
      gasLimit: 100000
    });
    
    console.log("Transaction hash:", updateTx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await updateTx.wait();
    console.log("✅ Fee updated successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Verify the update
    console.log("\n🔍 Verifying update...");
    const newFee = await factory.getDeploymentFee();
    console.log("Updated Fee:", ethers.formatEther(newFee), "ETH");
    
    if (newFee === NEW_DEPLOYMENT_FEE) {
      console.log("✅ Fee update verified!");
    } else {
      console.log("❌ Fee update failed - values don't match");
    }
    
    // Check if user can now deploy
    const balance = await ethers.provider.getBalance(signer.address);
    console.log("\n👤 Your Account:");
    console.log("Balance:", ethers.formatEther(balance), "ETH");
    console.log("Can deploy:", balance >= newFee ? "✅ Yes" : "❌ No (still insufficient funds)");
    
    return {
      oldFee: ethers.formatEther(currentFee),
      newFee: ethers.formatEther(newFee),
      transactionHash: updateTx.hash,
      gasUsed: receipt.gasUsed.toString()
    };
    
  } catch (error) {
    console.error("❌ Error updating deployment fee:", error.message);
    throw error;
  }
}

async function main() {
  try {
    const result = await updateDeploymentFee();
    
    console.log("\n✅ Fee update completed!");
    console.log("\n📋 Summary:");
    console.log("Old Fee:", result.oldFee, "ETH");
    console.log("New Fee:", result.newFee, "ETH");
    console.log("Transaction:", result.transactionHash);
    console.log("Gas Used:", result.gasUsed);
    
    console.log("\n🔗 Next Steps:");
    console.log("1. You can now deploy strategy tokens for 0.026 ETH");
    console.log("2. Run: npx hardhat run scripts/create-hyperevm-strategy.js --network hyperevm");
    
  } catch (error) {
    console.error("Fee update failed:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);