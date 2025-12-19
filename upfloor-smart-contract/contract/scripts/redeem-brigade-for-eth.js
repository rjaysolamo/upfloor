const { ethers } = require("hardhat");

// Configuration
const TOKEN_ADDRESS = "0x10075Ed58bD714e8b0b04B630A1EF704A29d8D62"; // Brigade token
const BRIGADE_AMOUNT = "0.1"; // Amount of BRIGADE tokens to redeem

async function main() {
    console.log("\n🔄 Redeeming BRIGADE tokens for ETH...\n");

    const [redeemer] = await ethers.getSigners();
    console.log("Redeemer account:", redeemer.address);

    // Connect to token contract
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);

    const brigadeAmount = ethers.parseEther(BRIGADE_AMOUNT);

    // Check BRIGADE balance
    const brigadeBalance = await token.balanceOf(redeemer.address);
    console.log("Your BRIGADE balance:", ethers.formatEther(brigadeBalance), "BRIGADE\n");

    if (brigadeBalance < brigadeAmount) {
        console.error("❌ Insufficient BRIGADE tokens");
        console.log("   Required:", BRIGADE_AMOUNT, "BRIGADE");
        console.log("   Available:", ethers.formatEther(brigadeBalance), "BRIGADE");
        process.exit(1);
    }

    // Preview redemption
    const ethOut = await token.previewRedeem(brigadeAmount);
    console.log("📊 Redemption details:");
    console.log("  BRIGADE to redeem:", BRIGADE_AMOUNT, "BRIGADE");
    console.log("  ETH to receive:", ethers.formatEther(ethOut), "ETH");

    // Check current supply
    const currentSupply = await token.totalSupply();
    console.log("  Current supply:", ethers.formatEther(currentSupply), "BRIGADE");

    // Get initial ETH balance
    const initialEthBalance = await ethers.provider.getBalance(redeemer.address);

    // Step 1: Redeem BRIGADE tokens for ETH
    console.log("\n📝 Redeeming BRIGADE tokens for ETH");
    console.log("  Redeeming", BRIGADE_AMOUNT, "BRIGADE tokens");

    try {
        // Set minimum output to 95% of expected (5% slippage tolerance)
        const minOut = (ethOut * 95n) / 100n;
        
        const redeemTx = await token.redeem(
            brigadeAmount,
            redeemer.address, // from
            redeemer.address, // to
            minOut
        );
        console.log("  Transaction hash:", redeemTx.hash);

        const receipt = await redeemTx.wait();
        console.log("  ✅ Tokens redeemed successfully!");

        // Get redeemed amount from event
        const redeemEvent = receipt.logs.find(log => {
            try {
                const parsed = token.interface.parseLog(log);
                return parsed?.name === "Redeem";
            } catch {
                return false;
            }
        });

        if (redeemEvent) {
            const parsedEvent = token.interface.parseLog(redeemEvent);
            const tokensRedeemed = parsedEvent.args.tokens;
            const ethReceived = parsedEvent.args.assets;

            console.log("\n🎉 Redemption Details:");
            console.log("  Tokens redeemed:", ethers.formatEther(tokensRedeemed), "BRIGADE");
            console.log("  ETH received:", ethers.formatEther(ethReceived), "ETH");
        }

        // Check new balances
        const newBrigadeBalance = await token.balanceOf(redeemer.address);
        const newEthBalance = await ethers.provider.getBalance(redeemer.address);

        console.log("\n💼 Your new balances:");
        console.log("  BRIGADE:", ethers.formatEther(newBrigadeBalance), "BRIGADE");
        console.log("  ETH:", ethers.formatEther(newEthBalance), "ETH");
        console.log("  ETH gained:", ethers.formatEther(newEthBalance - initialEthBalance), "ETH");

        // Check new supply
        const newSupply = await token.totalSupply();
        console.log("\n📊 New total supply:", ethers.formatEther(newSupply), "BRIGADE");

    } catch (error) {
        console.error("\n❌ Error redeeming:");
        console.error(error.message);

        if (error.message.includes("BadAmount")) {
            console.log("\n💡 Invalid amount specified");
        } else if (error.message.includes("Slippage")) {
            console.log("\n💡 Price moved too much, try again or increase slippage tolerance");
        } else if (error.message.includes("ERC20InsufficientBalance")) {
            console.log("\n💡 Insufficient BRIGADE token balance");
        }

        throw error;
    }

    console.log("\n✅ Redemption complete!\n");

    console.log("═══════════════════════════════════════════════════");
    console.log("📋 REDEMPTION SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Token:                 BrigadeAssets (BRIGADE)");
    console.log("Redemption Method:     Burn BRIGADE for ETH");
    console.log("Token Contract:        ", TOKEN_ADDRESS);
    console.log("Redeemer:              ", redeemer.address);
    console.log("BRIGADE Redeemed:      ", BRIGADE_AMOUNT, "BRIGADE");
    console.log("═══════════════════════════════════════════════════");
    console.log("\n🔗 View Token on Taikoscan:");
    console.log(`https://taikoscan.io/address/${TOKEN_ADDRESS}`);
    console.log("\n🔗 View Your Wallet:");
    console.log(`https://taikoscan.io/address/${redeemer.address}`);
    console.log("═══════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;