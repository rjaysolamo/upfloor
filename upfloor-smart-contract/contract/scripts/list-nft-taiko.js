const { ethers } = require("hardhat");

// Taiko Configuration
const TAIKO_MARKETPLACE = "0x89aFa165F40f2210c99e87E706C0160503E12F1c";
const TAIKO_PAYMENT_TOKEN = "0xA9d23408b9bA935c230493c40C73824Df71A0975";

// BrigadeAssets Configuration  
const TOKEN_ADDRESS = "0x1dB78Fac36F88d55836587Ba9328B952227b19b8";
const NFT_COLLECTION = "0x77d64eca9ede120280e9ffe19990f0caf4bb45da";
const TOKEN_ID = 8487;
const LISTING_PRICE = "10"; // 10 TAIKO tokens

async function main() {
    console.log("\n📝 Listing NFT on Taiko Marketplace...\n");

    const [seller] = await ethers.getSigners();
    console.log("Seller account:", seller.address);
    
    const balance = await ethers.provider.getBalance(seller.address);
    console.log("ETH balance:", ethers.formatEther(balance), "ETH\n");

    // Connect to contracts
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    const nftABI = ["function ownerOf(uint256 tokenId) view returns (address)", "function setApprovalForAll(address operator, bool approved)"];
    const nftContract = new ethers.Contract(NFT_COLLECTION, nftABI, seller);

    // Check NFT ownership
    console.log("📋 NFT Information:");
    console.log("  Collection:", NFT_COLLECTION);
    console.log("  Token ID:", TOKEN_ID);
    
    const owner = await nftContract.ownerOf(TOKEN_ID);
    console.log("  Current Owner:", owner);
    
    if (owner.toLowerCase() !== seller.address.toLowerCase()) {
        console.log("\n⚠️  You don't own this NFT!");
        console.log("The NFT is owned by:", owner);
        console.log("Your address:", seller.address);
        console.log("\nCannot list NFT you don't own.");
        process.exit(1);
    }

    console.log("\n📝 Step 1: Approve marketplace for NFT collection");
    
    // Encode setApprovalForAll function call
    const approvalData = nftContract.interface.encodeFunctionData("setApprovalForAll", [
        TAIKO_MARKETPLACE,
        true
    ]);

    console.log("  Approving marketplace...");
    
    try {
        const approvalTx = await token.executeExternalCall(
            NFT_COLLECTION,
            0,
            approvalData
        );
        
        console.log("  Transaction hash:", approvalTx.hash);
        await approvalTx.wait();
        console.log("  ✅ Marketplace approved for NFT collection");
    } catch (error) {
        console.error("  ❌ Error approving marketplace:", error.message);
        throw error;
    }

    console.log("\n📝 Step 2: List NFT on marketplace");
    
    const price = ethers.parseEther(LISTING_PRICE);
    console.log("  Listing price:", LISTING_PRICE, "TAIKO");
    
    // Encode listNFT function call
    const listNFTABI = ["function listNFT(address nftContract, uint256 tokenId, uint256 price, address paymentToken)"];
    const marketplaceInterface = new ethers.Interface(listNFTABI);
    const listData = marketplaceInterface.encodeFunctionData("listNFT", [
        NFT_COLLECTION,
        TOKEN_ID,
        price,
        TAIKO_PAYMENT_TOKEN
    ]);

    console.log("  Listing NFT...");
    
    try {
        const listTx = await token.executeExternalCall(
            TAIKO_MARKETPLACE,
            0,
            listData
        );
        
        console.log("  Transaction hash:", listTx.hash);
        const receipt = await listTx.wait();
        console.log("  ✅ NFT listed successfully!");

        // Check for reward
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
        console.error("\n❌ Error listing NFT:");
        console.error(error.message);
        throw error;
    }

    console.log("\n✅ Listing complete!\n");

    console.log("═══════════════════════════════════════════════════");
    console.log("📋 LISTING SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("NFT Collection:       ", NFT_COLLECTION);
    console.log("Token ID:             ", TOKEN_ID);
    console.log("Listing Price:        ", LISTING_PRICE, "TAIKO");
    console.log("Payment Token:        ", TAIKO_PAYMENT_TOKEN);
    console.log("Marketplace:          ", TAIKO_MARKETPLACE);
    console.log("═══════════════════════════════════════════════════");
    console.log("\n🔗 View on Taikoscan:");
    console.log(`https://taikoscan.io/token/${NFT_COLLECTION}?a=${TOKEN_ID}`);
    console.log("\n🔗 View Marketplace:");
    console.log(`https://taikoscan.io/address/${TAIKO_MARKETPLACE}`);
    console.log("═══════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;
