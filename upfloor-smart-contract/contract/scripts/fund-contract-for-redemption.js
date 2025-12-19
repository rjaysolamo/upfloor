const { ethers } = require("hardhat");

const TOKEN_ADDRESS = "0x10075Ed58bD714e8b0b04B630A1EF704A29d8D62";
const ETH_TO_SEND = "0.001"; // Send 0.001 ETH to contract

async function main() {
    console.log("💰 Funding contract for redemptions\n");

    const [user] = await ethers.getSigners();
    console.log("User address:", user.address);
    console.log("Contract address:", TOKEN_ADDRESS);

    // Check current contract balance
    const currentBalance = await ethers.provider.getBalance(TOKEN_ADDRESS);
    console.log("Current contract ETH balance:", ethers.formatEther(currentBalance));

    const ethAmount = ethers.parseEther(ETH_TO_SEND);
    console.log("ETH to send:", ETH_TO_SEND, "ETH");

    // Send ETH to contract
    console.log("\nSending ETH to contract...");
    const tx = await user.sendTransaction({
        to: TOKEN_ADDRESS,
        value: ethAmount
    });

    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ ETH sent successfully!");

    // Check new balance
    const newBalance = await ethers.provider.getBalance(TOKEN_ADDRESS);
    console.log("New contract ETH balance:", ethers.formatEther(newBalance));

    console.log("\n✅ Contract is now funded for redemptions!");
    console.log("💡 You can now use the regular redeem function");
}

main().catch(console.error);