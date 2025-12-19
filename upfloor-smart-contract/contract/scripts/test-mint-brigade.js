const { ethers } = require("hardhat");

// BrigadeAssets Configuration
const ROUTER_ADDRESS = "0x7be7Ffd7d381C20074A08d4398D87a578289F6c7";
const TOKEN_ADDRESS = "0x1dB78Fac36F88d55836587Ba9328B952227b19b8";
const MINT_AMOUNT_ETH = "0.00001"; // 0.00001 ETH

async function main() {
    console.log("\n🪙 Minting BrigadeAssets Tokens...\n");

    const [minter] = await ethers.getSigners();
    console.log("Minter account:", minter.address);
    
    const balance = await ethers.provider.getBalance(minter.address);
    console.log("ETH balance:", ethers.formatEther(balance), "ETH\n");

    // Connect to contracts
    const router = await ethers.getContractAt("MintRouter", ROUTER_ADDRESS);
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);

    const mintValue = ethers.parseEther(MINT_AMOUNT_ETH);
    console.log("💰 Mint Details:");
    console.log("  Amount to pay:", MINT_AMOUNT_ETH, "ETH");
    console.log("  Router:", ROUTER_ADDRESS);
    console.log("  Token:", TOKEN_ADDRESS);

    // Preview how many tokens we'll get
    console.log("\n📊 Previewing mint...");
    try {
        const preview = await router.previewMint(mintValue);
        console.log("  Expected tokens:", ethers.formatEther(preview), "BRIGADE");
    } catch (error) {
        console.log("  ⚠️  Could not preview (might be first mint)");
    }

    // Check current supply
    const currentSupply = await token.totalSupply();
    console.log("  Current supply:", ethers.formatEther(currentSupply), "BRIGADE");

    // Mint tokens - we need to specify amount of tokens to mint
    // Let's mint 1000 tokens
    const tokensToMint = ethers.parseEther("1000");
    
    console.log("\n📝 Minting tokens...");
    console.log("  Tokens to mint:", ethers.formatEther(tokensToMint), "BRIGADE");
    
    try {
        const mintTx = await router.mint(tokensToMint, minter.address, { value: mintValue });
        console.log("  Transaction hash:", mintTx.hash);
        
        const receipt = await mintTx.wait();
        console.log("  ✅ Tokens minted successfully!");

        // Get minted amount from event
        const mintEvent = receipt.logs.find(log => {
            try {
                const parsed = token.interface.parseLog(log);
                return parsed?.name === "Mint";
            } catch {
                return false;
            }
        });

        if (mintEvent) {
            const parsedEvent = token.interface.parseLog(mintEvent);
            const tokensMinted = parsedEvent.args.tokens;
            const assetsPaid = parsedEvent.args.assets;
            
            console.log("\n🎉 Mint Details:");
            console.log("  Tokens minted:", ethers.formatEther(tokensMinted), "BRIGADE");
            console.log("  ETH paid:", ethers.formatEther(assetsPaid), "ETH");
        }

        // Check new balance
        const newBalance = await token.balanceOf(minter.address);
        console.log("\n💼 Your token balance:", ethers.formatEther(newBalance), "BRIGADE");

        // Check new supply
        const newSupply = await token.totalSupply();
        console.log("📊 New total supply:", ethers.formatEther(newSupply), "BRIGADE");

        // Check for royalty payment
        const royaltyEvents = receipt.logs.filter(log => {
            try {
                const parsed = token.interface.parseLog(log);
                return parsed?.name === "CollectionRoyaltyPaid";
            } catch {
                return false;
            }
        });

        if (royaltyEvents.length > 0) {
            const royaltyEvent = token.interface.parseLog(royaltyEvents[0]);
            console.log("\n👑 Royalty paid:", ethers.formatEther(royaltyEvent.args.amount), "BRIGADE");
            console.log("   Recipient:", royaltyEvent.args.collectionOwner);
        }

    } catch (error) {
        console.error("\n❌ Error minting:");
        console.error(error.message);
        
        if (error.message.includes("InsufficientETH")) {
            console.log("\n💡 You need to send more ETH");
        } else if (error.message.includes("CapExceeded")) {
            console.log("\n💡 Max supply reached");
        }
        
        throw error;
    }

    console.log("\n✅ Mint complete!\n");

    console.log("═══════════════════════════════════════════════════");
    console.log("📋 MINT SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Token:                 BrigadeAssets (BRIGADE)");
    console.log("Router:                ", ROUTER_ADDRESS);
    console.log("Token Contract:        ", TOKEN_ADDRESS);
    console.log("Minter:                ", minter.address);
    console.log("Amount Paid:           ", MINT_AMOUNT_ETH, "ETH");
    console.log("═══════════════════════════════════════════════════");
    console.log("\n🔗 View Token on Taikoscan:");
    console.log(`https://taikoscan.io/address/${TOKEN_ADDRESS}`);
    console.log("\n🔗 View Your Wallet:");
    console.log(`https://taikoscan.io/address/${minter.address}`);
    console.log("═══════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;
