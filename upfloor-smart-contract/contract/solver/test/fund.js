// fund-funstrat.js
// Script to fund the FunStrat contract with native ETH (on Arbitrum) using ethers.js

import { ethers } from "ethers";

async function main() {
    console.log("💰 Funding FunStrat Contract with ETH (Arbitrum)");
    console.log("================================================\n");

    // --- Configuration ---
    const CONTRACT_ADDRESS = "0x94f2C8ad410Fde86e815bEe2238Ea6c76f9622ed";
    const FUNDING_AMOUNT = ethers.parseEther("0.00012"); // Adjust as needed

    // --- Hardcoded Arbitrum RPC ---
    const RPC_URL = "https://arb1.arbitrum.io/rpc"; // Official Arbitrum One RPC

    // --- Setup Provider and Wallet ---
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const PRIVATE_KEY = "f8f4965cf6954b363a274bb538a93012bef9b32a875744c6217db04b83dfdeb7"; // ⚠️ Replace or load securely
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("Deployer address:", wallet.address);
    console.log("Deployer balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH\n");

    console.log("📋 Funding Details:");
    console.log("Contract Address:", CONTRACT_ADDRESS);
    console.log("Funding Amount:", ethers.formatEther(FUNDING_AMOUNT), "ETH");

    try {
        // --- Check Current Balances ---
        console.log("\n🔍 Current Balances:");
        const deployerBalance = await provider.getBalance(wallet.address);
        const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);

        console.log("Deployer balance:", ethers.formatEther(deployerBalance), "ETH");
        console.log("Contract balance:", ethers.formatEther(contractBalance), "ETH");

        if (deployerBalance < FUNDING_AMOUNT) {
            console.log("❌ Insufficient balance to fund contract");
            console.log("Required:", ethers.formatEther(FUNDING_AMOUNT), "ETH");
            console.log("Available:", ethers.formatEther(deployerBalance), "ETH");
            return;
        }

        // --- Send ETH (native token on Arbitrum) ---
        console.log("\n💸 Sending ETH to contract...");
        const tx = await wallet.sendTransaction({
            to: CONTRACT_ADDRESS,
            value: FUNDING_AMOUNT
        });

        console.log("⏳ Transaction submitted:", tx.hash);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

        // --- Check Updated Balances ---
        console.log("\n📊 Updated Balances:");
        const newDeployerBalance = await provider.getBalance(wallet.address);
        const newContractBalance = await provider.getBalance(CONTRACT_ADDRESS);

        console.log("Deployer balance:", ethers.formatEther(newDeployerBalance), "ETH");
        console.log("Contract balance:", ethers.formatEther(newContractBalance), "ETH");
        console.log("ETH sent:", ethers.formatEther(FUNDING_AMOUNT), "ETH");

        console.log("\n🎉 Contract funding completed successfully!");
        console.log("\n🔗 Contract Information:");
        console.log("Contract Address:", CONTRACT_ADDRESS);
        console.log("Contract ETH balance:", ethers.formatEther(newContractBalance), "ETH");

    } catch (error) {
        console.error("❌ Contract funding failed:", error.message);

        if (error.message.includes("insufficient balance")) {
            console.log("💡 Solution: You don't have enough ETH to fund the contract");
        } else if (error.message.includes("insufficient funds")) {
            console.log("💡 Solution: Check your ETH balance or gas settings");
        }

        process.exit(1);
    }
}

main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
});
