const { ethers } = require("hardhat");

// Configuration
const TOKEN_ADDRESS = "0x10075Ed58bD714e8b0b04B630A1EF704A29d8D62"; // New token with mintWithTaiko
const TAIKO_PAYMENT_TOKEN = "0xA9d23408b9bA935c230493c40C73824Df71A0975";
const TAIKO_AMOUNT = "0.01"; // Amount of TAIKO to spend

async function main() {
    console.log("\n🪙 Minting BrigadeAssets with TAIKO Tokens...\n");

    const [minter] = await ethers.getSigners();
    console.log("Minter account:", minter.address);

    // Connect to contracts
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    const taikoTokenABI = [
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)"
    ];
    const taikoToken = new ethers.Contract(TAIKO_PAYMENT_TOKEN, taikoTokenABI, minter);

    const taikoAmount = ethers.parseEther(TAIKO_AMOUNT);

    // Check TAIKO balance
    const taikoBalance = await taikoToken.balanceOf(minter.address);
    console.log("Your TAIKO balance:", ethers.formatEther(taikoBalance), "TAIKO\n");

    if (taikoBalance < taikoAmount) {
        console.error("❌ Insufficient TAIKO tokens");
        console.log("   Required:", TAIKO_AMOUNT, "TAIKO");
        console.log("   Available:", ethers.formatEther(taikoBalance), "TAIKO");
        process.exit(1);
    }

    // Check current supply
    const currentSupply = await token.totalSupply();
    console.log("📊 Mint details:");
    console.log("  TAIKO to spend:", TAIKO_AMOUNT, "TAIKO");
    console.log("  Current supply:", ethers.formatEther(currentSupply), "BRIGADE");

    // Try different token amounts to find what fits in 0.10 TAIKO budget
    let tokensToMint = ethers.parseEther("0.1");
    let mintCost = await token.previewMint(tokensToMint);

    // Binary search to find max tokens we can mint with 0.10 TAIKO
    let low = 0n;
    let high = ethers.parseEther("10");
    let bestAmount = tokensToMint;

    while (high - low > ethers.parseEther("0.001")) {
        const mid = (low + high) / 2n;
        try {
            const cost = await token.previewMint(mid);
            if (cost <= taikoAmount) {
                bestAmount = mid;
                low = mid;
            } else {
                high = mid;
            }
        } catch {
            high = mid;
        }
    }

    tokensToMint = bestAmount;
    mintCost = await token.previewMint(tokensToMint);

    console.log("  Tokens to mint:", ethers.formatEther(tokensToMint), "BRIGADE");
    console.log("  Actual cost:", ethers.formatEther(mintCost), "TAIKO");

    // Step 1: Approve TAIKO tokens
    console.log("\n📝 Step 1: Approve TAIKO tokens");
    const currentAllowance = await taikoToken.allowance(minter.address, TOKEN_ADDRESS);
    console.log("  Current allowance:", ethers.formatEther(currentAllowance), "TAIKO");

    if (currentAllowance < taikoAmount) {
        console.log("  Approving", TAIKO_AMOUNT, "TAIKO...");
        const approveTx = await taikoToken.approve(TOKEN_ADDRESS, taikoAmount);
        console.log("  Transaction hash:", approveTx.hash);
        await approveTx.wait();
        console.log("  ✅ TAIKO tokens approved");
    } else {
        console.log("  ✅ Already approved");
    }

    // Step 2: Mint with TAIKO
    console.log("\n📝 Step 2: Mint tokens with TAIKO");
    console.log("  Minting", ethers.formatEther(tokensToMint), "BRIGADE tokens");

    try {
        const mintTx = await token.mintWithTaiko(tokensToMint, minter.address);
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
            console.log("  TAIKO paid:", ethers.formatEther(assetsPaid), "TAIKO");
        }

        // Check new balances
        const newBrigadeBalance = await token.balanceOf(minter.address);
        const newTaikoBalance = await taikoToken.balanceOf(minter.address);

        console.log("\n💼 Your new balances:");
        console.log("  BRIGADE:", ethers.formatEther(newBrigadeBalance), "BRIGADE");
        console.log("  TAIKO:", ethers.formatEther(newTaikoBalance), "TAIKO");

        // Check new supply
        const newSupply = await token.totalSupply();
        console.log("\n📊 New total supply:", ethers.formatEther(newSupply), "BRIGADE");

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
            console.log("\n💡 Insufficient TAIKO tokens");
        } else if (error.message.includes("CapExceeded")) {
            console.log("\n💡 Max supply reached");
        } else if (error.message.includes("InvalidAddress")) {
            console.log("\n💡 Taiko payment token not configured");
        }

        throw error;
    }

    console.log("\n✅ Mint complete!\n");

    console.log("═══════════════════════════════════════════════════");
    console.log("📋 MINT SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Token:                 BrigadeAssets (BRIGADE)");
    console.log("Payment Method:        TAIKO Token (ERC-20)");
    console.log("Token Contract:        ", TOKEN_ADDRESS);
    console.log("Minter:                ", minter.address);
    console.log("TAIKO Spent:           ", TAIKO_AMOUNT, "TAIKO");
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
