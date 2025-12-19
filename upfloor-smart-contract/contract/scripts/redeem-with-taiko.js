const { ethers } = require("hardhat");

// Configuration
const TOKEN_ADDRESS = "0x10075Ed58bD714e8b0b04B630A1EF704A29d8D62"; // Brigade token
const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"; // TAIKO token
const BRIGADE_AMOUNT = "0.05"; // Amount of BRIGADE tokens to redeem

async function main() {
    console.log("\n🔄 Redeeming BRIGADE tokens for TAIKO...\n");

    const [redeemer] = await ethers.getSigners();
    console.log("Redeemer account:", redeemer.address);

    // Connect to contracts
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    
    const taikoTokenABI = [
        "function balanceOf(address account) view returns (uint256)",
        "function symbol() view returns (string)",
        "function name() view returns (string)"
    ];
    const taikoToken = new ethers.Contract(TAIKO_TOKEN_ADDRESS, taikoTokenABI, redeemer);

    const brigadeAmount = ethers.parseEther(BRIGADE_AMOUNT);

    // Check initial balances
    const initialBrigadeBalance = await token.balanceOf(redeemer.address);
    const initialTaikoBalance = await taikoToken.balanceOf(redeemer.address);
    const contractTaikoBalance = await taikoToken.balanceOf(TOKEN_ADDRESS);
    
    console.log("📊 Initial Balances:");
    console.log("Your BRIGADE balance:", ethers.formatEther(initialBrigadeBalance), "BRIGADE");
    console.log("Your TAIKO balance:", ethers.formatEther(initialTaikoBalance), "TAIKO");
    console.log("Contract TAIKO balance:", ethers.formatEther(contractTaikoBalance), "TAIKO\n");

    if (initialBrigadeBalance < brigadeAmount) {
        console.error("❌ Insufficient BRIGADE tokens");
        console.log("   Required:", BRIGADE_AMOUNT, "BRIGADE");
        console.log("   Available:", ethers.formatEther(initialBrigadeBalance), "BRIGADE");
        process.exit(1);
    }

    // Preview redemption
    const taikoOut = await token.previewRedeem(brigadeAmount);
    console.log("📋 Redemption Preview:");
    console.log("  BRIGADE to redeem:", BRIGADE_AMOUNT, "BRIGADE");
    console.log("  TAIKO to receive:", ethers.formatEther(taikoOut), "TAIKO");

    if (contractTaikoBalance < taikoOut) {
        console.error("❌ Contract has insufficient TAIKO tokens");
        console.log("   Required:", ethers.formatEther(taikoOut), "TAIKO");
        console.log("   Available:", ethers.formatEther(contractTaikoBalance), "TAIKO");
        process.exit(1);
    }

    // Check current supply
    const currentSupply = await token.totalSupply();
    console.log("  Current supply:", ethers.formatEther(currentSupply), "BRIGADE");

    // Step 1: Redeem BRIGADE tokens for TAIKO
    console.log("\n📝 Redeeming BRIGADE tokens for TAIKO");
    console.log("  Redeeming", BRIGADE_AMOUNT, "BRIGADE tokens");

    try {
        // Set minimum output to 95% of expected (5% slippage tolerance)
        const minOut = (taikoOut * 95n) / 100n;
        
        const redeemTx = await token.redeemWithTaiko(
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
            const taikoReceived = parsedEvent.args.assets;

            console.log("\n🎉 Redemption Details:");
            console.log("  Tokens redeemed:", ethers.formatEther(tokensRedeemed), "BRIGADE");
            console.log("  TAIKO received:", ethers.formatEther(taikoReceived), "TAIKO");
        }

        // Check new balances
        const newBrigadeBalance = await token.balanceOf(redeemer.address);
        const newTaikoBalance = await taikoToken.balanceOf(redeemer.address);
        const newContractTaikoBalance = await taikoToken.balanceOf(TOKEN_ADDRESS);

        console.log("\n💼 Your new balances:");
        console.log("  BRIGADE:", ethers.formatEther(newBrigadeBalance), "BRIGADE");
        console.log("  TAIKO:", ethers.formatEther(newTaikoBalance), "TAIKO");
        
        console.log("\n📈 Changes:");
        console.log("  BRIGADE change:", ethers.formatEther(newBrigadeBalance - initialBrigadeBalance), "BRIGADE");
        console.log("  TAIKO gained:", ethers.formatEther(newTaikoBalance - initialTaikoBalance), "TAIKO");
        console.log("  Contract TAIKO remaining:", ethers.formatEther(newContractTaikoBalance), "TAIKO");

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
        } else if (error.message.includes("InsufficientETH")) {
            console.log("\n💡 Contract has insufficient TAIKO tokens");
        } else if (error.message.includes("InvalidAddress")) {
            console.log("\n💡 TAIKO payment token not configured");
        }

        throw error;
    }

    console.log("\n✅ TAIKO redemption complete!\n");

    console.log("═══════════════════════════════════════════════════");
    console.log("📋 REDEMPTION SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Token:                 BrigadeAssets (BRIGADE)");
    console.log("Redemption Method:     Burn BRIGADE for TAIKO");
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