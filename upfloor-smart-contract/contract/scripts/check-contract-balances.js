const { ethers } = require("hardhat");

const TOKEN_ADDRESS = "0x10075Ed58bD714e8b0b04B630A1EF704A29d8D62";
const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975";

async function main() {
    console.log("🔍 Checking Contract Balances\n");

    const [user] = await ethers.getSigners();
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    
    const taikoTokenABI = [
        "function balanceOf(address account) view returns (uint256)",
        "function symbol() view returns (string)",
        "function name() view returns (string)"
    ];
    const taikoToken = new ethers.Contract(TAIKO_TOKEN_ADDRESS, taikoTokenABI, user);

    console.log("Contract Address:", TOKEN_ADDRESS);
    console.log("User Address:", user.address);
    
    // Check contract balances
    console.log("\n💰 Contract Balances:");
    const contractEthBalance = await ethers.provider.getBalance(TOKEN_ADDRESS);
    console.log("ETH:", ethers.formatEther(contractEthBalance));
    
    const contractTaikoBalance = await taikoToken.balanceOf(TOKEN_ADDRESS);
    console.log("TAIKO:", ethers.formatEther(contractTaikoBalance));
    
    // Check user balances
    console.log("\n👤 Your Balances:");
    const userEthBalance = await ethers.provider.getBalance(user.address);
    console.log("ETH:", ethers.formatEther(userEthBalance));
    
    const userTaikoBalance = await taikoToken.balanceOf(user.address);
    console.log("TAIKO:", ethers.formatEther(userTaikoBalance));
    
    const userBrigadeBalance = await token.balanceOf(user.address);
    console.log("BRIGADE:", ethers.formatEther(userBrigadeBalance));
    
    // Check token info
    console.log("\n📊 Token Info:");
    const totalSupply = await token.totalSupply();
    console.log("Total BRIGADE Supply:", ethers.formatEther(totalSupply));
    
    const taikoName = await taikoToken.name();
    const taikoSymbol = await taikoToken.symbol();
    console.log("TAIKO Token:", taikoName, `(${taikoSymbol})`);
    
    // Check protocol fee recipient
    const protocolFeeRecipient = await token.getProtocolFeeRecipient();
    console.log("\n🏛️ Protocol Info:");
    console.log("Fee Recipient:", protocolFeeRecipient);
    
    const feeRecipientTaikoBalance = await taikoToken.balanceOf(protocolFeeRecipient);
    console.log("Fee Recipient TAIKO:", ethers.formatEther(feeRecipientTaikoBalance));
    
    // Check if contract has TAIKO payment token set
    const taikoPaymentToken = await token.taikoPaymentToken();
    console.log("Contract TAIKO Payment Token:", taikoPaymentToken);
    
    console.log("\n💡 Analysis:");
    if (contractEthBalance === 0n && contractTaikoBalance > 0n) {
        console.log("❌ Contract has TAIKO but no ETH for redemptions");
        console.log("💡 The contract needs ETH to process redemptions");
        console.log("💡 Options:");
        console.log("   1. Add a redeemWithTaiko function to the contract");
        console.log("   2. Swap contract's TAIKO to ETH");
        console.log("   3. Send ETH to the contract");
    } else if (contractEthBalance === 0n && contractTaikoBalance === 0n) {
        console.log("❌ Contract has no funds for redemptions");
        console.log("💡 This suggests the TAIKO was sent elsewhere (likely to fee recipient)");
    } else {
        console.log("✅ Contract has sufficient funds for redemptions");
    }
}

main().catch(console.error);