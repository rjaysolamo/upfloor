const { ethers } = require("hardhat");

// Taiko Network Configuration
const TAIKO_MARKETPLACE = "0x89aFa165F40f2210c99e87E706C0160503E12F1c";
const TAIKO_PAYMENT_TOKEN = "0xA9d23408b9bA935c230493c40C73824Df71A0975";

/**
 * Example: List NFT on Taiko Marketplace
 * The marketplace uses ERC-20 tokens (Taiko Token) for payment
 */
async function listNFTOnTaiko(tokenAddress, nftCollectionAddress, tokenId, priceInTaiko) {
    const [signer] = await ethers.getSigners();
    console.log("\n📝 Listing NFT on Taiko Marketplace...");
    
    const token = await ethers.getContractAt("UpFloorToken", tokenAddress);
    const nftCollection = await ethers.getContractAt("IERC721", nftCollectionAddress);
    
    // Step 1: Approve marketplace for NFT (one-time per collection)
    console.log("1. Approving marketplace for NFT collection...");
    const setApprovalData = nftCollection.interface.encodeFunctionData("setApprovalForAll", [
        TAIKO_MARKETPLACE,
        true
    ]);
    
    await token.executeExternalCall(nftCollectionAddress, 0, setApprovalData);
    console.log("   ✅ Marketplace approved");
    
    // Step 2: List NFT on marketplace
    console.log("\n2. Listing NFT...");
    const price = ethers.parseUnits(priceInTaiko.toString(), 18);
    
    // Encode listNFT function call
    // function listNFT(address nftContract, uint256 tokenId, uint256 price, address paymentToken)
    const listNFTABI = ["function listNFT(address nftContract, uint256 tokenId, uint256 price, address paymentToken)"];
    const marketplaceInterface = new ethers.Interface(listNFTABI);
    const listData = marketplaceInterface.encodeFunctionData("listNFT", [
        nftCollectionAddress,
        tokenId,
        price,
        TAIKO_PAYMENT_TOKEN
    ]);
    
    const tx = await token.executeExternalCall(TAIKO_MARKETPLACE, 0, listData);
    await tx.wait();
    
    console.log("   ✅ NFT listed successfully");
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Price: ${priceInTaiko} TAIKO`);
}

/**
 * Example: Buy NFT from Taiko Marketplace
 * Buyer needs to approve Taiko tokens before buying
 */
async function buyNFTFromTaiko(tokenAddress, listingId, priceInTaiko) {
    const [buyer] = await ethers.getSigners();
    console.log("\n💰 Buying NFT from Taiko Marketplace...");
    
    const token = await ethers.getContractAt("UpFloorToken", tokenAddress);
    const price = ethers.parseUnits(priceInTaiko.toString(), 18);
    
    // Step 1: Approve Taiko payment token for marketplace
    console.log("1. Approving Taiko tokens for marketplace...");
    const approveABI = ["function approve(address spender, uint256 amount) returns (bool)"];
    const erc20Interface = new ethers.Interface(approveABI);
    const approveData = erc20Interface.encodeFunctionData("approve", [
        TAIKO_MARKETPLACE,
        price
    ]);
    
    await token.executeExternalCall(TAIKO_PAYMENT_TOKEN, 0, approveData);
    console.log("   ✅ Taiko tokens approved");
    
    // Step 2: Buy NFT
    console.log("\n2. Buying NFT...");
    const buyNFTABI = ["function buyNFT(uint256 listingId)"];
    const marketplaceInterface = new ethers.Interface(buyNFTABI);
    const buyData = marketplaceInterface.encodeFunctionData("buyNFT", [listingId]);
    
    const tx = await token.executeExternalCall(TAIKO_MARKETPLACE, 0, buyData);
    await tx.wait();
    
    console.log("   ✅ NFT purchased successfully");
    console.log(`   Listing ID: ${listingId}`);
    console.log(`   Price: ${priceInTaiko} TAIKO`);
}

/**
 * Example: Cancel listing on Taiko Marketplace
 */
async function cancelListingOnTaiko(tokenAddress, listingId) {
    const [seller] = await ethers.getSigners();
    console.log("\n❌ Canceling listing on Taiko Marketplace...");
    
    const token = await ethers.getContractAt("UpFloorToken", tokenAddress);
    
    const cancelABI = ["function cancelListing(uint256 listingId)"];
    const marketplaceInterface = new ethers.Interface(cancelABI);
    const cancelData = marketplaceInterface.encodeFunctionData("cancelListing", [listingId]);
    
    const tx = await token.executeExternalCall(TAIKO_MARKETPLACE, 0, cancelData);
    await tx.wait();
    
    console.log("   ✅ Listing canceled successfully");
    console.log(`   Listing ID: ${listingId}`);
}

/**
 * Setup Taiko marketplace integration (if not auto-configured)
 */
async function setupTaikoIntegration(tokenAddress) {
    const [owner] = await ethers.getSigners();
    console.log("\n⚙️  Setting up Taiko marketplace integration...");
    
    const token = await ethers.getContractAt("UpFloorToken", tokenAddress);
    
    // Set Taiko marketplace address (if not already set)
    const currentMarketplace = await token.taikoMarketplace();
    if (currentMarketplace === ethers.ZeroAddress) {
        console.log("Setting Taiko marketplace address...");
        await token.setTaikoMarketplace(TAIKO_MARKETPLACE);
        console.log("✅ Taiko marketplace set");
    } else {
        console.log("✅ Taiko marketplace already configured");
    }
    
    // Set Taiko payment token (if not already set)
    const currentPaymentToken = await token.taikoPaymentToken();
    if (currentPaymentToken === ethers.ZeroAddress) {
        console.log("Setting Taiko payment token...");
        await token.setTaikoPaymentToken(TAIKO_PAYMENT_TOKEN);
        console.log("✅ Taiko payment token set");
    } else {
        console.log("✅ Taiko payment token already configured");
    }
    
    console.log("\n✅ Taiko integration setup complete!");
}

// Example usage
async function main() {
    const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "YOUR_TOKEN_ADDRESS";
    const NFT_COLLECTION = process.env.NFT_COLLECTION || "YOUR_NFT_COLLECTION";
    
    console.log("=== Taiko Marketplace Integration ===");
    console.log("Token:", TOKEN_ADDRESS);
    console.log("NFT Collection:", NFT_COLLECTION);
    
    // Setup integration
    await setupTaikoIntegration(TOKEN_ADDRESS);
    
    // Example: List NFT
    // await listNFTOnTaiko(TOKEN_ADDRESS, NFT_COLLECTION, 123, 10); // List token #123 for 10 TAIKO
    
    // Example: Buy NFT
    // await buyNFTFromTaiko(TOKEN_ADDRESS, 1, 10); // Buy listing #1 for 10 TAIKO
    
    // Example: Cancel listing
    // await cancelListingOnTaiko(TOKEN_ADDRESS, 1); // Cancel listing #1
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = {
    listNFTOnTaiko,
    buyNFTFromTaiko,
    cancelListingOnTaiko,
    setupTaikoIntegration
};
