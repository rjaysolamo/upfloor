const { ethers } = require("hardhat");

// Contract addresses from deployment
const TOKEN_ADDRESS = "0xA46DD94c18D242859602f83115d33274aC20aEc2";
const STRATEGY_ADDRESS = "0xdaD75fD5e168aAEdE7e6f32612cC02F4723Fd7aC";
const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975";
const TAIKO_MARKETPLACE = "0x89aFa165F40f2210c99e87E706C0160503E12F1c";

// Hardcoded cheapest NFT from Okidori API (5 TAIKO Ceppi Gene)
const CHEAPEST_NFT = {
  tokenId: "2779",
  listingId: 7027,
  price: "5.0",
  priceWei: "5000000000000000000",
  collection: "0x77d64eca9ede120280e9ffe19990f0caf4bb45da",
  seller: "0xb51af3f3242fed0e2e800f80737e565e19ad6534",
  name: "Ceppi Gene #155",
  description: "Import x500 Ceppi genes for purchases, upgrades and Gold.",
  imageUrl: "https://assets.tacostudios.io/brigade/assets/gene/ceppi.png"
};

// ABI for NFT buying functions (from frontend code)
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

// Taiko Marketplace ABI
const TAIKO_MARKETPLACE_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "listingId", "type": "uint256"}],
    "name": "buyNFT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "listingId", "type": "uint256"}],
    "name": "getListingPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// ERC-20 TAIKO Token ABI
const TAIKO_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// NFT Contract ABI
const NFT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Get the hardcoded cheapest NFT data
 */
function getCheapestNFT() {
  console.log("💰 Using hardcoded cheapest NFT:");
  console.log("  - Name:", CHEAPEST_NFT.name);
  console.log("  - Token ID:", CHEAPEST_NFT.tokenId);
  console.log("  - Listing ID:", CHEAPEST_NFT.listingId);
  console.log("  - Price:", CHEAPEST_NFT.price, "TAIKO");
  console.log("  - Collection:", CHEAPEST_NFT.collection);
  console.log("  - Seller:", CHEAPEST_NFT.seller);
  console.log("  - Description:", CHEAPEST_NFT.description);
  
  return CHEAPEST_NFT;
}

/**
 * Buy NFT using TAIKO tokens through the token contract (based on frontend code)
 */
async function buyNFTWithTaiko(nftListing) {
  try {
    console.log("🛒 Buying NFT with TAIKO tokens via executeExternalCall...");
    console.log("NFT Collection:", nftListing.collection);
    console.log("Token ID:", nftListing.tokenId);
    console.log("Listing ID:", nftListing.listingId);
    console.log("Expected Price:", nftListing.price, "TAIKO");

    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    // Connect to contracts
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
    const marketplaceContract = new ethers.Contract(TAIKO_MARKETPLACE, TAIKO_MARKETPLACE_ABI, signer);
    const taikoContract = new ethers.Contract(TAIKO_TOKEN_ADDRESS, TAIKO_TOKEN_ABI, signer);
    const nftContract = new ethers.Contract(nftListing.collection, NFT_ABI, signer);

    // Step 1: Verify listing price on-chain
    console.log("\n📋 Step 1: Verifying NFT listing price on-chain...");
    let currentPrice;
    try {
      currentPrice = await marketplaceContract.getListingPrice(nftListing.listingId);
      console.log("On-chain price:", ethers.formatEther(currentPrice), "TAIKO");
      console.log("API price:", nftListing.price, "TAIKO");
      
      // Verify prices match (within small tolerance for precision)
      const priceDiff = Math.abs(Number(ethers.formatEther(currentPrice)) - Number(nftListing.price));
      if (priceDiff > 0.001) {
        console.log("⚠️  Price mismatch detected! Using on-chain price.");
      }
    } catch (error) {
      console.log("⚠️  Could not get on-chain listing price, using API price");
      currentPrice = BigInt(nftListing.priceWei);
    }

    // Step 2: Check token contract's TAIKO balance
    console.log("\n💰 Step 2: Checking token contract TAIKO balance...");
    const contractTaikoBalance = await taikoContract.balanceOf(TOKEN_ADDRESS);
    console.log("Contract TAIKO balance:", ethers.formatEther(contractTaikoBalance), "TAIKO");

    if (contractTaikoBalance < currentPrice) {
      throw new Error(`Insufficient contract TAIKO balance: ${ethers.formatEther(contractTaikoBalance)} < ${ethers.formatEther(currentPrice)}`);
    }

    // Step 3: Check current NFT owner
    console.log("\n🔍 Step 3: Checking current NFT owner...");
    const currentOwner = await nftContract.ownerOf(nftListing.tokenId);
    console.log("Current NFT owner:", currentOwner);
    console.log("Expected seller:", nftListing.seller);

    // Step 4: Approve TAIKO tokens for marketplace
    console.log("\n✅ Step 4: Approving TAIKO tokens for marketplace...");
    const approveTx = await tokenContract.approveTokens(TAIKO_MARKETPLACE, currentPrice);
    console.log("Approve transaction:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ TAIKO tokens approved for marketplace");

    // Verify allowance
    const allowance = await taikoContract.allowance(TOKEN_ADDRESS, TAIKO_MARKETPLACE);
    console.log("Current allowance:", ethers.formatEther(allowance), "TAIKO");

    // Step 5: Encode the buyNFT function call
    console.log("\n🔧 Step 5: Encoding buyNFT function call...");
    const marketplaceInterface = new ethers.Interface(TAIKO_MARKETPLACE_ABI);
    const buyNFTData = marketplaceInterface.encodeFunctionData("buyNFT", [nftListing.listingId]);
    console.log("Encoded data:", buyNFTData);

    // Step 6: Execute the NFT purchase through executeExternalCall
    console.log("\n🚀 Step 6: Executing NFT purchase...");
    const buyTx = await tokenContract.executeExternalCall(
      TAIKO_MARKETPLACE,  // target: Taiko marketplace
      0,                  // value: 0 ETH (we're using TAIKO tokens)
      buyNFTData,         // data: encoded buyNFT function call
      { gasLimit: 1000000 }
    );

    console.log("Buy transaction:", buyTx.hash);
    const receipt = await buyTx.wait();
    console.log("✅ NFT purchase transaction completed!");

    // Step 7: Verify the purchase
    console.log("\n🔍 Step 7: Verifying purchase...");
    const newContractBalance = await taikoContract.balanceOf(TOKEN_ADDRESS);
    console.log("New contract TAIKO balance:", ethers.formatEther(newContractBalance), "TAIKO");
    console.log("TAIKO spent:", ethers.formatEther(contractTaikoBalance - newContractBalance), "TAIKO");

    // Check new NFT owner
    const newOwner = await nftContract.ownerOf(nftListing.tokenId);
    console.log("New NFT owner:", newOwner);

    if (newOwner.toLowerCase() === STRATEGY_ADDRESS.toLowerCase()) {
      console.log("✅ Strategy now owns the NFT!");
    } else if (newOwner.toLowerCase() === TOKEN_ADDRESS.toLowerCase()) {
      console.log("✅ Token contract now owns the NFT!");
    } else {
      console.log("⚠️  NFT owner is different from expected");
    }

    // Check for reward events
    console.log("\n🎁 Checking for reward events...");
    const rewardEvents = receipt.logs.filter(log => {
      try {
        const tokenInterface = new ethers.Interface([
          "event RewardPaid(address indexed user, uint256 amount)"
        ]);
        const parsed = tokenInterface.parseLog(log);
        return parsed?.name === "RewardPaid";
      } catch {
        return false;
      }
    });

    if (rewardEvents.length > 0) {
      const tokenInterface = new ethers.Interface([
        "event RewardPaid(address indexed user, uint256 amount)"
      ]);
      const rewardEvent = tokenInterface.parseLog(rewardEvents[0]);
      console.log("🎁 Reward paid:", ethers.formatEther(rewardEvent.args.amount), "BRIGADE tokens");
    } else {
      console.log("No reward events found");
    }

    return {
      success: true,
      transactionHash: buyTx.hash,
      nftContract: nftListing.collection,
      tokenId: nftListing.tokenId,
      listingId: nftListing.listingId,
      pricePaid: ethers.formatEther(currentPrice),
      gasUsed: receipt.gasUsed.toString(),
      newOwner: newOwner,
      originalSeller: nftListing.seller
    };

  } catch (error) {
    console.error("❌ NFT purchase failed:", error.message);
    throw error;
  }
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("🛒 NFT PURCHASE WITH TAIKO TOKENS");
  console.log("═══════════════════════════════════════════════════");
  console.log("Token Contract:       ", TOKEN_ADDRESS);
  console.log("Strategy Contract:    ", STRATEGY_ADDRESS);
  console.log("TAIKO Marketplace:    ", TAIKO_MARKETPLACE);
  console.log("TAIKO Token:          ", TAIKO_TOKEN_ADDRESS);
  console.log("Target Collection:    ", CHEAPEST_NFT.collection);
  console.log("═══════════════════════════════════════════════════\n");

  try {
    // Step 1: Get the hardcoded cheapest NFT
    console.log("🔍 Step 1: Getting cheapest NFT data...");
    const cheapestNFT = getCheapestNFT();
    
    console.log("\n💰 Target NFT Details:");
    console.log("Name:                 ", cheapestNFT.name);
    console.log("Collection:           ", cheapestNFT.collection);
    console.log("Token ID:             ", cheapestNFT.tokenId);
    console.log("Listing ID:           ", cheapestNFT.listingId);
    console.log("Price:                ", cheapestNFT.price, "TAIKO");
    console.log("Seller:               ", cheapestNFT.seller);
    console.log("Description:          ", cheapestNFT.description);
    
    // Step 2: Buy the NFT
    console.log("\n🛒 Step 2: Purchasing NFT...");
    const result = await buyNFTWithTaiko(cheapestNFT);
    
    console.log("\n✅ Purchase completed successfully!");
    console.log("\n═══════════════════════════════════════════════════");
    console.log("📋 PURCHASE SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Transaction Hash:     ", result.transactionHash);
    console.log("NFT Contract:         ", result.nftContract);
    console.log("Token ID:             ", result.tokenId);
    console.log("Listing ID:           ", result.listingId);
    console.log("Price Paid:           ", result.pricePaid, "TAIKO");
    console.log("Gas Used:             ", result.gasUsed);
    console.log("Original Seller:      ", result.originalSeller);
    console.log("New Owner:            ", result.newOwner);
    console.log("═══════════════════════════════════════════════════");
    console.log("\n🔗 View transaction on Taikoscan:");
    console.log(`https://taikoscan.io/tx/${result.transactionHash}`);
    console.log("\n🔗 View NFT on Taikoscan:");
    console.log(`https://taikoscan.io/token/${result.nftContract}?a=${result.tokenId}`);
    console.log("\n🔗 View Strategy:");
    console.log(`https://taikoscan.io/address/${STRATEGY_ADDRESS}`);
    console.log("\n🔗 View on Okidori:");
    console.log(`https://okidori.xyz/collection/${result.nftContract}`);
    console.log("═══════════════════════════════════════════════════\n");

  } catch (error) {
    console.error("\n❌ Purchase failed:");
    console.error(error.message);
    
    if (error.message.includes("insufficient")) {
      console.log("\n💡 Possible solutions:");
      console.log("  - Fund the token contract with more TAIKO tokens");
      console.log("  - Check if the listing is still available");
      console.log("  - Verify the listing ID is correct");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = { buyNFTWithTaiko, getCheapestNFT };