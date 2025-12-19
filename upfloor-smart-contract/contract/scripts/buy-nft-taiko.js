const { ethers } = require("hardhat");

// Taiko Configuration
const TAIKO_MARKETPLACE = "0x89aFa165F40f2210c99e87E706C0160503E12F1c";
const TAIKO_PAYMENT_TOKEN = "0xA9d23408b9bA935c230493c40C73824Df71A0975";

// BrigadeAssets Configuration
const TOKEN_ADDRESS = "0x1dB78Fac36F88d55836587Ba9328B952227b19b8";
const STRATEGY_ADDRESS = "0x6d15CfC14A74785785A91B84029e2a59b53B035D";
const NFT_COLLECTION = "0x77d64eca9ede120280e9ffe19990f0caf4bb45da";
const TOKEN_ID = 8487;

async function main() {
    console.log("\n🛒 Buying NFT from Taiko Marketplace...\n");

    const [buyer] = await ethers.getSigners();
    console.log("Buyer account:", buyer.address);

    const balance = await ethers.provider.getBalance(buyer.address);
    console.log("ETH balance:", ethers.formatEther(balance), "ETH");

    // Connect to contracts
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    const paymentToken = await ethers.getContractAt("IERC20", TAIKO_PAYMENT_TOKEN);

    // Check Taiko token balance
    const taikoBalance = await paymentToken.balanceOf(STRATEGY_ADDRESS);
    console.log("Strategy Taiko balance:", ethers.formatEther(taikoBalance), "TAIKO\n");

    if (taikoBalance === 0n) {
        console.error("❌ Strategy has no Taiko tokens. Please fund it first.");
        process.exit(1);
    }

    // Get listing information from marketplace
    console.log("📋 NFT Information:");
    console.log("  Collection:", NFT_COLLECTION);
    console.log("  Token ID:", TOKEN_ID);

    // Note: You'll need to get the listing ID from the marketplace
    // For now, let's assume we need to find it or you provide it
    console.log("\n⚠️  To buy the NFT, we need the listing ID from the marketplace.");
    console.log("You can find it by:");
    console.log("1. Going to the Taiko marketplace");
    console.log("2. Finding the listing for token ID", TOKEN_ID);
    console.log("3. Getting the listing ID\n");

    // Listing ID from Okidori API
    const LISTING_ID = process.env.LISTING_ID || "7394"; // Token ID 8487 - Curio Crop

    console.log("Using listing ID:", LISTING_ID);
    console.log("\n🔍 Checking listing details...");

    // Get listing price (you may need to query the marketplace contract)
    // For now, let's proceed with the purchase flow

    console.log("\n📝 Step 1: Approve Taiko tokens for marketplace");

    // Encode approve function call
    const approveABI = ["function approve(address spender, uint256 amount) returns (bool)"];
    const erc20Interface = new ethers.Interface(approveABI);

    // Approve a large amount (or specific amount if you know the price)
    const approveAmount = ethers.parseEther("1000"); // 1000 TAIKO
    const approveData = erc20Interface.encodeFunctionData("approve", [
        TAIKO_MARKETPLACE,
        approveAmount
    ]);

    console.log("  Approving", ethers.formatEther(approveAmount), "TAIKO for marketplace...");

    const approveTx = await token.executeExternalCall(
        TAIKO_PAYMENT_TOKEN,
        0,
        approveData
    );

    console.log("  Transaction hash:", approveTx.hash);
    await approveTx.wait();
    console.log("  ✅ Taiko tokens approved");

    // Check allowance (from token contract, not strategy)
    const allowance = await paymentToken.allowance(TOKEN_ADDRESS, TAIKO_MARKETPLACE);
    console.log("  Current allowance:", ethers.formatEther(allowance), "TAIKO");

    console.log("\n📝 Step 2: Buy NFT from marketplace");

    // Encode buyNFT function call
    const buyNFTABI = ["function buyNFT(uint256 listingId)"];
    const marketplaceInterface = new ethers.Interface(buyNFTABI);
    const buyData = marketplaceInterface.encodeFunctionData("buyNFT", [LISTING_ID]);

    console.log("  Buying NFT with listing ID:", LISTING_ID);

    try {
        const buyTx = await token.executeExternalCall(
            TAIKO_MARKETPLACE,
            0,
            buyData
        );

        console.log("  Transaction hash:", buyTx.hash);
        const receipt = await buyTx.wait();
        console.log("  ✅ NFT purchased successfully!");

        // Check if strategy now owns the NFT
        const nftContract = await ethers.getContractAt("IERC721", NFT_COLLECTION);
        const owner = await nftContract.ownerOf(TOKEN_ID);
        console.log("\n📦 NFT Owner:", owner);

        if (owner.toLowerCase() === STRATEGY_ADDRESS.toLowerCase()) {
            console.log("✅ Strategy now owns the NFT!");
        } else {
            console.log("⚠️  NFT owner is different from strategy");
        }

        // Check reward
        const rewardEvents = receipt.logs.filter(log => {
            try {
                const parsed = token.interface.parseLog(log);
                return parsed?.name === "RewardPaid";
            } catch {
                return false;
            }
        });

        if (rewardEvents.length > 0) {
            const rewardEvent = token.interface.parseLog(rewardEvents[0]);
            console.log("\n🎁 Reward paid:", ethers.formatEther(rewardEvent.args.amount), "BRIGADE tokens");
        }

    } catch (error) {
        console.error("\n❌ Error buying NFT:");
        console.error(error.message);

        if (error.message.includes("insufficient")) {
            console.log("\n💡 Possible issues:");
            console.log("  - Strategy doesn't have enough Taiko tokens");
            console.log("  - Listing price is higher than approved amount");
            console.log("  - Listing ID is incorrect");
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
    console.log("Buyer (Strategy):     ", STRATEGY_ADDRESS);
    console.log("Token Contract:       ", TOKEN_ADDRESS);
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
