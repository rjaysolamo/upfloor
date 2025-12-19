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
    console.log("\n🛒 Buying NFT via Token Contract...\n");

    const [owner] = await ethers.getSigners();
    console.log("Owner account:", owner.address);

    // Connect to contracts
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    const paymentToken = await ethers.getContractAt("IERC20", TAIKO_PAYMENT_TOKEN);
    
    // Check token contract's Taiko balance
    const tokenTaikoBalance = await paymentToken.balanceOf(TOKEN_ADDRESS);
    console.log("Token contract Taiko balance:", ethers.formatEther(tokenTaikoBalance), "TAIKO");

    const priceInWei = ethers.parseEther(PRICE);
    console.log("NFT Price:", PRICE, "TAIKO\n");

    if (tokenTaikoBalance < priceInWei) {
        console.error("❌ Token contract doesn't have enough Taiko tokens");
        console.log("   Required:", ethers.formatEther(priceInWei), "TAIKO");
        console.log("   Available:", ethers.formatEther(tokenTaikoBalance), "TAIKO");
        console.log("\n💡 Please transfer TAIKO tokens from strategy to token contract:");
        console.log("   From:", STRATEGY_ADDRESS);
        console.log("   To:", TOKEN_ADDRESS);
        console.log("   Token:", TAIKO_PAYMENT_TOKEN);
        console.log("   Amount:", PRICE, "TAIKO");
        process.exit(1);
    }

    console.log("📋 NFT Information:");
    console.log("  Collection:", NFT_COLLECTION);
    console.log("  Token ID:", TOKEN_ID);
    console.log("  Listing ID:", LISTING_ID);
    console.log("  Price:", PRICE, "TAIKO");

    // Step 1: Approve marketplace to spend token contract's Taiko tokens
    console.log("\n📝 Step 1: Approve marketplace to spend token contract's Taiko tokens");
    
    const approveABI = ["function approve(address spender, uint256 amount) returns (bool)"];
    const erc20Interface = new ethers.Interface(approveABI);
    const approveData = erc20Interface.encodeFunctionData("approve", [
        TAIKO_MARKETPLACE,
        priceInWei
    ]);

    console.log("  Approving", PRICE, "TAIKO for marketplace...");
    
    try {
        const approveTx = await token.executeExternalCall(
            TAIKO_PAYMENT_TOKEN,
            0,
            approveData
        );
        
        console.log("  Transaction hash:", approveTx.hash);
        await approveTx.wait();
        console.log("  ✅ Marketplace approved");
    } catch (error) {
        console.error("  ❌ Error approving:", error.message);
        throw error;
    }

    // Check allowance
    const allowance = await paymentToken.allowance(TOKEN_ADDRESS, TAIKO_MARKETPLACE);
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
        const buyTx = await token.executeExternalCall(
            TAIKO_MARKETPLACE,
            0,
            buyData
        );
        
        console.log("  Transaction hash:", buyTx.hash);
        const receipt = await buyTx.wait();
        console.log("  ✅ NFT purchased successfully!");
        
        // Check if token contract now owns the NFT
        const nftABI = ["function ownerOf(uint256 tokenId) view returns (address)", "function safeTransferFrom(address from, address to, uint256 tokenId)"];
        const nftContract = new ethers.Contract(NFT_COLLECTION, nftABI, owner);
        const nftOwner = await nftContract.ownerOf(TOKEN_ID);
        console.log("\n📦 NFT Owner:", nftOwner);
        
        if (nftOwner.toLowerCase() === TOKEN_ADDRESS.toLowerCase()) {
            console.log("✅ Token contract now owns the NFT!");
            
            // Step 3: Transfer NFT to strategy
            console.log("\n📝 Step 3: Transfer NFT to strategy");
            
            const transferData = nftContract.interface.encodeFunctionData("safeTransferFrom", [
                TOKEN_ADDRESS,
                STRATEGY_ADDRESS,
                TOKEN_ID
            ]);
            
            const transferTx = await token.executeExternalCall(
                NFT_COLLECTION,
                0,
                transferData
            );
            
            console.log("  Transaction hash:", transferTx.hash);
            await transferTx.wait();
            console.log("  ✅ NFT transferred to strategy!");
            
            // Verify final owner
            const finalOwner = await nftContract.ownerOf(TOKEN_ID);
            console.log("\n📦 Final NFT Owner:", finalOwner);
            
            if (finalOwner.toLowerCase() === STRATEGY_ADDRESS.toLowerCase()) {
                console.log("✅ Strategy now owns the NFT!");
            }
        }

        // Check remaining balance
        const remainingBalance = await paymentToken.balanceOf(TOKEN_ADDRESS);
        console.log("\n💰 Token contract remaining Taiko balance:", ethers.formatEther(remainingBalance), "TAIKO");

        // Check for rewards
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
            console.log("   Recipient:", rewardEvent.args.caller);
        }

    } catch (error) {
        console.error("\n❌ Error buying NFT:");
        console.error(error.message);
        
        if (error.message.includes("insufficient")) {
            console.log("\n💡 Possible issues:");
            console.log("  - Token contract doesn't have enough Taiko tokens");
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
    console.log("Final Owner:          ", STRATEGY_ADDRESS);
    console.log("═══════════════════════════════════════════════════");
    console.log("\n🔗 View NFT on Taikoscan:");
    console.log(`https://taikoscan.io/token/${NFT_COLLECTION}?a=${TOKEN_ID}`);
    console.log("\n🔗 View Strategy:");
    console.log(`https://taikoscan.io/address/${STRATEGY_ADDRESS}`);
    console.log("\n🔗 View Token Contract:");
    console.log(`https://taikoscan.io/address/${TOKEN_ADDRESS}`);
    console.log("═══════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;
