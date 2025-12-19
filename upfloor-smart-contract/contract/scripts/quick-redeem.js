const { ethers } = require("hardhat");

// Quick redemption script - modify these values as needed
const TOKEN_ADDRESS = "0x10075Ed58bD714e8b0b04B630A1EF704A29d8D62";
const BRIGADE_AMOUNT = "0.05"; // Amount to redeem

async function main() {
    console.log("🔄 Quick BRIGADE Redemption\n");

    const [user] = await ethers.getSigners();
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    
    const amount = ethers.parseEther(BRIGADE_AMOUNT);
    
    // Check balance
    const balance = await token.balanceOf(user.address);
    console.log("BRIGADE balance:", ethers.formatEther(balance));
    
    if (balance < amount) {
        console.log("❌ Insufficient balance");
        return;
    }
    
    // Preview redemption
    const ethOut = await token.previewRedeem(amount);
    console.log("Will receive:", ethers.formatEther(ethOut), "ETH");
    
    // Redeem with 5% slippage tolerance
    const minOut = (ethOut * 95n) / 100n;
    
    console.log("\nRedeeming...");
    const tx = await token.redeem(amount, user.address, user.address, minOut);
    console.log("Transaction:", tx.hash);
    
    await tx.wait();
    console.log("✅ Redeemed successfully!");
    
    // Check new balance
    const newBalance = await token.balanceOf(user.address);
    console.log("New BRIGADE balance:", ethers.formatEther(newBalance));
}

main().catch(console.error);