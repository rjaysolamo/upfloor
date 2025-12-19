const { ethers } = require("hardhat");

const TAIKO_PAYMENT_TOKEN = "0xA9d23408b9bA935c230493c40C73824Df71A0975";
const STRATEGY_ADDRESS = "0x6d15CfC14A74785785A91B84029e2a59b53B035D";

async function main() {
    const [owner] = await ethers.getSigners();
    console.log("\n🔍 Checking TAIKO allowances...\n");
    console.log("Owner:", owner.address);
    console.log("Strategy:", STRATEGY_ADDRESS);
    
    const paymentToken = await ethers.getContractAt("IERC20", TAIKO_PAYMENT_TOKEN);
    
    // Check if strategy has approved owner
    const allowance = await paymentToken.allowance(STRATEGY_ADDRESS, owner.address);
    console.log("\nStrategy → Owner allowance:", ethers.formatEther(allowance), "TAIKO");
    
    if (allowance > 0) {
        console.log("✅ You can transfer TAIKO from strategy!");
    } else {
        console.log("❌ Strategy hasn't approved you to spend its TAIKO");
        console.log("\n💡 The strategy needs to approve you first, but it doesn't have executeExternalCall()");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
