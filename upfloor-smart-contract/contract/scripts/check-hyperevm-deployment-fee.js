const { ethers } = require("hardhat");

// HyperEVM Factory Address
const FACTORY_ADDRESS = "0x3F5a6dFd97D6e5d8ef2eA6Dd242d94ae5FDe1e6d";

// Factory ABI (minimal)
const FACTORY_ABI = [
  {
    "inputs": [],
    "name": "getDeploymentFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "APE_DEPLOYMENT_FEE",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ETH_DEPLOYMENT_FEE",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "HYPE_DEPLOYMENT_FEE",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PROTOCOL_FEE_RECIPIENT",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
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

async function checkDeploymentFee() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("💰 CHECKING HYPEREVM FACTORY DEPLOYMENT FEE");
  console.log("═══════════════════════════════════════════════════");
  
  const [signer] = await ethers.getSigners();
  console.log("Checking with account:", signer.address);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Factory Address:", FACTORY_ADDRESS);
  
  try {
    // Connect to factory
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
    
    console.log("\n📋 Factory Information:");
    
    // Get owner
    const owner = await factory.owner();
    console.log("Factory Owner:", owner);
    
    // Get protocol fee recipient
    const feeRecipient = await factory.PROTOCOL_FEE_RECIPIENT();
    console.log("Protocol Fee Recipient:", feeRecipient);
    
    // Get current deployment fee
    const currentFee = await factory.getDeploymentFee();
    console.log("\n💰 Current Deployment Fee:", ethers.formatEther(currentFee), "ETH");
    console.log("Current Deployment Fee (wei):", currentFee.toString());
    
    // Get all fee constants
    console.log("\n📊 Fee Constants:");
    
    try {
      const apeFee = await factory.APE_DEPLOYMENT_FEE();
      console.log("APE Chain Fee:", ethers.formatEther(apeFee), "ETH");
    } catch (e) {
      console.log("APE Chain Fee: Could not read");
    }
    
    try {
      const ethFee = await factory.ETH_DEPLOYMENT_FEE();
      console.log("Ethereum Fee:", ethers.formatEther(ethFee), "ETH");
    } catch (e) {
      console.log("Ethereum Fee: Could not read");
    }
    
    try {
      const hypeFee = await factory.HYPE_DEPLOYMENT_FEE();
      console.log("HyperEVM Fee:", ethers.formatEther(hypeFee), "ETH");
    } catch (e) {
      console.log("HyperEVM Fee: Could not read");
    }
    
    // Calculate USD equivalent (rough estimate)
    const ethPrice = 3870; // Rough ETH price in USD
    const feeInUSD = parseFloat(ethers.formatEther(currentFee)) * ethPrice;
    console.log("\n💵 Estimated Fee in USD: $" + feeInUSD.toFixed(4));
    
    // Check if user has enough balance
    const balance = await ethers.provider.getBalance(signer.address);
    console.log("\n👤 Your Account:");
    console.log("Balance:", ethers.formatEther(balance), "ETH");
    console.log("Can deploy:", balance >= currentFee ? "✅ Yes" : "❌ No (insufficient funds)");
    
    if (balance < currentFee) {
      const needed = currentFee - balance;
      console.log("Need additional:", ethers.formatEther(needed), "ETH");
    }
    
    return {
      currentFee: ethers.formatEther(currentFee),
      currentFeeWei: currentFee.toString(),
      owner,
      feeRecipient,
      userBalance: ethers.formatEther(balance),
      canDeploy: balance >= currentFee
    };
    
  } catch (error) {
    console.error("❌ Error checking deployment fee:", error.message);
    throw error;
  }
}

async function main() {
  try {
    const result = await checkDeploymentFee();
    
    console.log("\n✅ Fee check completed!");
    console.log("\n🔗 Next Steps:");
    if (result.canDeploy) {
      console.log("1. You can deploy a strategy token now");
      console.log("2. Run: npx hardhat run scripts/create-hyperevm-strategy.js --network hyperevm");
    } else {
      console.log("1. Add more ETH to your wallet");
      console.log("2. Current fee:", result.currentFee, "ETH");
    }
    
  } catch (error) {
    console.error("Fee check failed:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);