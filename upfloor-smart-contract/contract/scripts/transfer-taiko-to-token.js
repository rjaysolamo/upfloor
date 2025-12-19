const { ethers } = require("hardhat");

// Configuration
const TAIKO_PAYMENT_TOKEN = "0xA9d23408b9bA935c230493c40C73824Df71A0975";
const STRATEGY_ADDRESS = "0x6d15CfC14A74785785A91B84029e2a59b53B035D";
const TOKEN_ADDRESS = "0x1dB78Fac36F88d55836587Ba9328B952227b19b8";
const AMOUNT = "5"; // 5 TAIKO

async function main() {
    console.log("\n💸 Transferring TAIKO from Strategy to Token Contract...\n");

    const [owner] = await ethers.getSigners();
    console.log("Owner account:", owner.address);

    // Connect to contracts
    const strategy = await ethers.getContractAt("UpFloorStrategy", STRATEGY_ADDRESS);
    const paymentToken = await ethers.getContractAt("IERC20", TAIKO_PAYMENT_TOKEN);
    
    // Check strategy's balance
    const strategyBalance = await paymentToken.balanceOf(STRATEGY_ADDRESS);
    console.log("Strategy Taiko balance:", ethers.formatEther(strategyBalance), "TAIKO");

    const amountInWei = ethers.parseEther(AMOUNT);
    console.log("Amount to transfer:", AMOUNT, "TAIKO\n");

    if (strategyBalance < amountInWei) {
        console.error("❌ Strategy doesn't have enough Taiko tokens");
        console.log("   Required:", ethers.formatEther(amountInWei), "TAIKO");
        console.log("   Available:", ethers.formatEther(strategyBalance), "TAIKO");
        process.exit(1);
    }

    console.log("📋 Transfer Details:");
    console.log("  From:", STRATEGY_ADDRESS);
    console.log("  To:", TOKEN_ADDRESS);
    console.log("  Token:", TAIKO_PAYMENT_TOKEN);
    console.log("  Amount:", AMOUNT, "TAIKO");

    // Encode transfer function call
    console.log("\n📝 Executing transfer...");
    
    const transferABI = ["function transfer(address to, uint256 amount) returns (bool)"];
    const erc20Interface = new ethers.Interface(transferABI);
    const transferData = erc20Interface.encodeFunctionData("transfer", [
        TOKEN_ADDRESS,
        amountInWei
    ]);

    try {
        // Call transfer on the payment token FROM the strategy contract
        const transferTx = await strategy.executeExternalCall(
            TAIKO_PAYMENT_TOKEN,
            0,
            transferData
        );
        
        console.log("  Transaction hash:", transferTx.hash);
        await transferTx.wait();
        console.log("  ✅ Transfer successful!");
        
        // Check balances after transfer
        const strategyBalanceAfter = await paymentToken.balanceOf(STRATEGY_ADDRESS);
        const tokenBalanceAfter = await paymentToken.balanceOf(TOKEN_ADDRESS);
        
        console.log("\n💰 Balances after transfer:");
        console.log("  Strategy:", ethers.formatEther(strategyBalanceAfter), "TAIKO");
        console.log("  Token Contract:", ethers.formatEther(tokenBalanceAfter), "TAIKO");

    } catch (error) {
        console.error("\n❌ Error transferring:");
        console.error(error.message);
        throw error;
    }

    console.log("\n✅ Transfer complete!\n");
    console.log("═══════════════════════════════════════════════════");
    console.log("📋 TRANSFER SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("From:                 ", STRATEGY_ADDRESS);
    console.log("To:                   ", TOKEN_ADDRESS);
    console.log("Amount:               ", AMOUNT, "TAIKO");
    console.log("Token:                ", TAIKO_PAYMENT_TOKEN);
    console.log("═══════════════════════════════════════════════════");
    console.log("\n💡 Next step: Run the buy script");
    console.log("npx hardhat run scripts/buy-nft-via-token.js --network taikoalethia");
    console.log("═══════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;
