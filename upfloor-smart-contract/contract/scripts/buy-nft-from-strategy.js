const { ethers } = require("hardhat");

// Taiko Configuration
const TAIKO_MARKETPLACE = "0x89aFa165F40f2210c99e87E706C0160503E12F1c";
const TAIKO_PAYMENT_TOKEN = "0xA9d23408b9bA935c230493c40C73824Df71A0975";

// BrigadeAssets Configuration
const TOKEN_ADDRESS = "0x1dB78Fac36F88d55836587Ba9328B952227b19b8";
const STRATEGY_ADDRESS = "0x6d15CfC14A74785785A91B84029e2a59b53B035D";
const NFT_COLLECTION = "0x77d64eca9ede120280e9ffe19990f0caf4bb45da";
const TOKEN_ID = 8487;
const LISTING_ID = 7394;
const PRICE = "5"; // 5 TAIKO

async function main() {
    console.log("\n🛒 Strategy Buying NFT from Taiko Marketplace...\n");

    const [owner] = await ethers.getSigners();
    console.log("Owner account:", owner.address);
    
    const balance = await ethers.provider.getBalance(owner.address);
    console.log("ETH balance:", ethers.formatEther(balance), "ETH");

    // Connect to contracts
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    const strategy = await ethers.getContractAt("UpFloorStrategy", STRATEGY_ADDRESS);
    const paymentToken = await ethers.getContractAt("IERC20", TAIKO_PAYMENT_TOKEN);
    
    // Check strategy's Taiko token balance
    const strategyTaikoBalance = await paymentToken.balanceOf(STRATEGY_ADDRESS);
    console.log("Strategy Taiko balance:", ethers.formatEther(strategyTaikoBalance), "TAIKO");

    const priceInWei = ethers.parseEther(PRICE);
    console.log("NFT Price:", PRICE, "TAIKO\n");

    if (strategyTaikoBalance < priceInWei) {
        console.error("❌ Strategy doesn't have enough Taiko tokens");
        console.log("   Required:", ethers.formatEther(priceInWei), "TAIKO");
        console.log("   Available:", ethers.formatEther(strategyTaikoBalance), "TAIKO");
        process.exit(1);
    }

    console.log("📋 NFT Information:");
    console.log("  Collection:", NFT_COLLECTION);
    console.log("  Token ID:", TOKEN_ID);
    console.log("  Listing ID:", LISTING_ID);
    console.log("  Price:", PRICE, "TAIKO");

    // Step 1: Strategy approves marketplace to spend its Taiko tokens
    console.log("\n📝 Step 1: Approve marketplace to spend strategy's Taiko tokens");
    
    const approveABI = ["function approve(address spender, uint256 amount) returns (bool)"];
    const erc20Interface = new ethers.Interface(approveABI);
    const approveData = erc20Interface.encodeFunctionData("approve", [
        TAIKO_MARKETPLACE,
        priceInWei
    ]);

    console.log("  Approving", PRICE, "TAIKO for marketplace...");
    
    try {
        // Call approve on the payment token FROM the strategy contract
        // We do this by having the strategy contract call the payment token
        const approveTx = await strategy.connect(owner).executeExternalCall(
            TAIKO_PAYMENT_TOKEN,
            0,
            approveData,
            { gasLimit: 500000 }
        );
        
        console.log("  Transaction hash:", approveTx.hash);
        await approveTx.wait();
        console.log("  ✅ Marketplace approved to spend strategy's Taiko tokens");
    } catch (error) {
        console.error("  ❌ Error approving:", error.message);
        throw error;
    }

    // Check allowance
    const allowance = await paymentToken.allowance(STRATEGY_ADDRESS, TAIKO_MARKETPLACE);
    console.log("  Current allowance:", ethers.formatEther(allowance), "TAIKO");

    if (allowance < priceInWei) {
        console.error("❌ Allowance is still insufficient");
        process.exit(1);
    }

    // Step 2: Buy NFT from marketplace
    console.log("\n📝 Step 2: Buy NFT from marketplace");
    
    const buyNFTABI = ["function buyNFT(uint256 listingId)"];
    const marketplaceInterface = new ethers.Interface(buyNFTABI);
    const buyData = marketplaceInterface.encodeFunctionData("buyNFT", [LISTING_ID]);

    console.log("  Buying NFT with listing ID:", LISTING_ID);
    
    try {
        // Call buyNFT on the marketplace FROM the strategy contract
        const buyTx = await strategy.connect(owner).executeExternalCall(
            TAIKO_MARKETPLACE,
            0,
            buyData,
            { gasLimit: 1000000 }
        );
        
        console.log("  Transaction hash:", buyTx.hash);
        const receipt = await buyTx.wait();
        console.log("  ✅ NFT purchased successfully!");
        
        // Check if strategy now owns the NFT
        const nftABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
        const nftContract = new ethers.Contract(NFT_COLLECTION, nftABI, owner);
        const nftOwner = await nftContract.ownerOf(TOKEN_ID);
        console.log("\n📦 NFT Owner:", nftOwner);
        
        if (nftOwner.toLowerCase() === STRATEGY_ADDRESS.toLowerCase()) {
            console.log("✅ Strategy now owns the NFT!");
        } else {
            console.log("⚠️  NFT owner is different from strategy");
        }

        // Check remaining balance
        const remainingBalance = await paymentToken.balanceOf(STRATEGY_ADDRESS);
        console.log("\n💰 Strategy remaining Taiko balance:", ethers.formatEther(remainingBalance), "TAIKO");

    } catch (error) {
        console.error("\n❌ Error buying NFT:");
        console.error(error.message);
        
        if (error.message.includes("insufficient")) {
            console.log("\n💡 Possible issues:");
            console.log("  - Strategy doesn't have enough Taiko tokens");
            console.log("  - Listing price changed");
            console.log("  - Listing was canceled");
        }
        
        throw error;
    }

    console.log("\n✅ Purchase complete!\n");

    console.log("═══════════════════════════════════════════════════");
    console.log("📋 PURCHASE SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("NFT Collection:       ", NFT_COLLECTION);
    console.log("Token ID:             ", TOKEN_ID);
    console.log("Listing ID:           ", LISTING_ID);
    console.log("Price Paid:           ", PRICE, "TAIKO");
    console.log("Buyer (Strategy):     ", STRATEGY_ADDRESS);
    console.log("═══════════════════════════════════════════════════");
    console.log("\n🔗 View NFT on Taikoscan:");
    console.log(`https://taikoscan.io/token/${NFT_COLLECTION}?a=${TOKEN_ID}`);
    console.log("\n🔗 View Strategy:");
    console.log(`https://taikoscan.io/address/${STRATEGY_ADDRESS}`);
    console.log("═══════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;
