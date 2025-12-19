const { ethers } = require("hardhat");

// Taiko Configuration
const TAIKO_MARKETPLACE = "0x89aFa165F40f2210c99e87E706C0160503E12F1c";
const TAIKO_PAYMENT_TOKEN = "0xA9d23408b9bA935c230493c40C73824Df71A0975";

// BrigadeAssets Configuration
const STRATEGY_ADDRESS = "0x6d15CfC14A74785785A91B84029e2a59b53B035D";
const NFT_COLLECTION = "0x77d64eca9ede120280e9ffe19990f0caf4bb45da";
const TOKEN_ID = 8487;
const LISTING_ID = 7394;
const PRICE = "5"; // 5 TAIKO

async function main() {
    console.log("\n🛒 Buying NFT for Strategy from Taiko Marketplace...\n");

    const [buyer] = await ethers.getSigners();
    console.log("Buyer account:", buyer.address);
    
    // Connect to contracts
    const paymentToken = await ethers.getContractAt("IERC20", TAIKO_PAYMENT_TOKEN);
    const marketplace = new ethers.Contract(
        TAIKO_MARKETPLACE,
        ["function buyNFT(uint256 listingId)"],
        buyer
    );
    const nftContract = new ethers.Contract(
        NFT_COLLECTION,
        [
            "function ownerOf(uint256 tokenId) view returns (address)",
            "function safeTransferFrom(address from, address to, uint256 tokenId)"
        ],
        buyer
    );
    
    // Check buyer's Taiko token balance
    const buyerBalance = await paymentToken.balanceOf(buyer.address);
    console.log("Your Taiko balance:", ethers.formatEther(buyerBalance), "TAIKO");

    const priceInWei = ethers.parseEther(PRICE);
    console.log("NFT Price:", PRICE, "TAIKO\n");

    if (buyerBalance < priceInWei) {
        console.error("❌ You don't have enough Taiko tokens");
        console.log("   Required:", ethers.formatEther(priceInWei), "TAIKO");
        console.log("   Available:", ethers.formatEther(buyerBalance), "TAIKO");
        console.log("\n💡 You need to get Taiko tokens first or transfer from strategy");
        process.exit(1);
    }

    console.log("📋 NFT Information:");
    console.log("  Collection:", NFT_COLLECTION);
    console.log("  Token ID:", TOKEN_ID);
    console.log("  Listing ID:", LISTING_ID);
    console.log("  Price:", PRICE, "TAIKO");

    // Step 1: Approve marketplace
    console.log("\n📝 Step 1: Approve marketplace to spend your Taiko tokens");
    
    const currentAllowance = await paymentToken.allowance(buyer.address, TAIKO_MARKETPLACE);
    console.log("  Current allowance:", ethers.formatEther(currentAllowance), "TAIKO");

    if (currentAllowance < priceInWei) {
        console.log("  Approving", PRICE, "TAIKO for marketplace...");
        const approveTx = await paymentToken.approve(TAIKO_MARKETPLACE, priceInWei);
        console.log("  Transaction hash:", approveTx.hash);
        await approveTx.wait();
        console.log("  ✅ Marketplace approved");
    } else {
        console.log("  ✅ Already approved");
    }

    // Step 2: Buy NFT
    console.log("\n📝 Step 2: Buy NFT from marketplace");
    console.log("  Buying NFT with listing ID:", LISTING_ID);
    
    try {
        const buyTx = await marketplace.buyNFT(LISTING_ID, { gasLimit: 1000000 });
        console.log("  Transaction hash:", buyTx.hash);
        const receipt = await buyTx.wait();
        console.log("  ✅ NFT purchased successfully!");
        
        // Check NFT owner
        const nftOwner = await nftContract.ownerOf(TOKEN_ID);
        console.log("\n📦 NFT Owner:", nftOwner);
        
        if (nftOwner.toLowerCase() === buyer.address.toLowerCase()) {
            console.log("✅ You now own the NFT!");
            
            // Step 3: Transfer NFT to strategy
            console.log("\n📝 Step 3: Transfer NFT to strategy");
            const transferTx = await nftContract.safeTransferFrom(buyer.address, STRATEGY_ADDRESS, TOKEN_ID);
            console.log("  Transaction hash:", transferTx.hash);
            await transferTx.wait();
            console.log("  ✅ NFT transferred to strategy!");
            
            // Verify
            const finalOwner = await nftContract.ownerOf(TOKEN_ID);
            if (finalOwner.toLowerCase() === STRATEGY_ADDRESS.toLowerCase()) {
                console.log("✅ Strategy now owns the NFT!");
            }
        }

    } catch (error) {
        console.error("\n❌ Error buying NFT:");
        console.error(error.message);
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
    console.log("Final Owner:          ", STRATEGY_ADDRESS);
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
