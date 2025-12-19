const { ethers } = require("hardhat");

// Configuration - NEW TOKEN ADDRESS
const TOKEN_ADDRESS = "0xA46DD94c18D242859602f83115d33274aC20aEc2"; // New token with redeemWithTaiko
const TAIKO_PAYMENT_TOKEN = "0xA9d23408b9bA935c230493c40C73824Df71A0975";
const TAIKO_AMOUNT = "0.01"; // Amount of TAIKO to spend for minting
const BRIGADE_AMOUNT = "0.05"; // Amount of BRIGADE to redeem

async function main() {
    console.log("\n🧪 Testing Complete TAIKO Flow (Mint → Redeem)...\n");

    const [user] = await ethers.getSigners();
    console.log("User account:", user.address);

    // Connect to contracts
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    const taikoTokenABI = [
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)"
    ];
    const taikoToken = new ethers.Contract(TAIKO_PAYMENT_TOKEN, taikoTokenABI, user);

    const taikoAmount = ethers.parseEther(TAIKO_AMOUNT);
    const brigadeAmount = ethers.parseEther(BRIGADE_AMOUNT);

    // Check initial balances
    console.log("📊 Initial Balances:");
    const initialTaikoBalance = await taikoToken.balanceOf(user.address);
    const initialBrigadeBalance = await token.balanceOf(user.address);
    console.log("Your TAIKO:", ethers.formatEther(initialTaikoBalance), "TAIKO");
    console.log("Your BRIGADE:", ethers.formatEther(initialBrigadeBalance), "BRIGADE");

    if (initialTaikoBalance < taikoAmount) {
        console.error("❌ Insufficient TAIKO tokens for minting");
        console.log("   Required:", TAIKO_AMOUNT, "TAIKO");
        console.log("   Available:", ethers.formatEther(initialTaikoBalance), "TAIKO");
        process.exit(1);
    }

    // STEP 1: MINT WITH TAIKO
    console.log("\n🪙 STEP 1: Minting BRIGADE with TAIKO");

    // Find optimal mint amount
    let tokensToMint = ethers.parseEther("0.1");
    let mintCost = await token.previewMint(tokensToMint);

    // Binary search to find max tokens we can mint with available TAIKO
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
    console.log("  Cost:", ethers.formatEther(mintCost), "TAIKO");

    // Approve TAIKO tokens
    const currentAllowance = await taikoToken.allowance(user.address, TOKEN_ADDRESS);
    if (currentAllowance < taikoAmount) {
        console.log("  Approving TAIKO...");
        const approveTx = await taikoToken.approve(TOKEN_ADDRESS, taikoAmount);
        await approveTx.wait();
        console.log("  ✅ TAIKO approved");
    }

    // Mint tokens
    console.log("  Minting tokens...");
    const mintTx = await token.mintWithTaiko(tokensToMint, user.address);
    console.log("  Transaction hash:", mintTx.hash);
    await mintTx.wait();
    console.log("  ✅ Tokens minted!");

    // Check balances after mint
    const afterMintTaikoBalance = await taikoToken.balanceOf(user.address);
    const afterMintBrigadeBalance = await token.balanceOf(user.address);
    const contractTaikoBalance = await taikoToken.balanceOf(TOKEN_ADDRESS);

    console.log("\n📊 After Mint:");
    console.log("Your TAIKO:", ethers.formatEther(afterMintTaikoBalance), "TAIKO");
    console.log("Your BRIGADE:", ethers.formatEther(afterMintBrigadeBalance), "BRIGADE");
    console.log("Contract TAIKO:", ethers.formatEther(contractTaikoBalance), "TAIKO");

    // STEP 2: REDEEM WITH TAIKO
    console.log("\n🔄 STEP 2: Redeeming BRIGADE for TAIKO");

    // Check if we have enough BRIGADE to redeem
    if (afterMintBrigadeBalance < brigadeAmount) {
        console.log("  Adjusting redeem amount to available balance...");
        const adjustedAmount = afterMintBrigadeBalance;
        console.log("  Will redeem:", ethers.formatEther(adjustedAmount), "BRIGADE");
    }

    const redeemAmount = afterMintBrigadeBalance < brigadeAmount ? afterMintBrigadeBalance : brigadeAmount;

    // Preview redemption
    const taikoOut = await token.previewRedeem(redeemAmount);
    console.log("  BRIGADE to redeem:", ethers.formatEther(redeemAmount), "BRIGADE");
    console.log("  TAIKO to receive:", ethers.formatEther(taikoOut), "TAIKO");

    // Check if contract has enough TAIKO
    if (contractTaikoBalance < taikoOut) {
        console.error("❌ Contract has insufficient TAIKO for redemption");
        console.log("   Required:", ethers.formatEther(taikoOut), "TAIKO");
        console.log("   Available:", ethers.formatEther(contractTaikoBalance), "TAIKO");
        process.exit(1);
    }

    // Redeem tokens
    console.log("  Redeeming tokens...");
    const minOut = (taikoOut * 95n) / 100n; // 5% slippage tolerance

    const redeemTx = await token.redeemWithTaiko(
        redeemAmount,
        user.address, // from
        user.address, // to
        minOut
    );
    console.log("  Transaction hash:", redeemTx.hash);
    await redeemTx.wait();
    console.log("  ✅ Tokens redeemed!");

    // Check final balances
    const finalTaikoBalance = await taikoToken.balanceOf(user.address);
    const finalBrigadeBalance = await token.balanceOf(user.address);
    const finalContractTaikoBalance = await taikoToken.balanceOf(TOKEN_ADDRESS);

    console.log("\n📊 Final Balances:");
    console.log("Your TAIKO:", ethers.formatEther(finalTaikoBalance), "TAIKO");
    console.log("Your BRIGADE:", ethers.formatEther(finalBrigadeBalance), "BRIGADE");
    console.log("Contract TAIKO:", ethers.formatEther(finalContractTaikoBalance), "TAIKO");

    console.log("\n📈 Net Changes:");
    const taikoChange = finalTaikoBalance - initialTaikoBalance;
    const brigadeChange = finalBrigadeBalance - initialBrigadeBalance;

    console.log("TAIKO change:", ethers.formatEther(taikoChange), "TAIKO");
    console.log("BRIGADE change:", ethers.formatEther(brigadeChange), "BRIGADE");

    console.log("\n✅ Complete TAIKO flow test successful!");

    console.log("\n═══════════════════════════════════════════════════");
    console.log("📋 FLOW TEST SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ Mint with TAIKO:       SUCCESS");
    console.log("✅ Redeem with TAIKO:     SUCCESS");
    console.log("Token Address:            ", TOKEN_ADDRESS);
    console.log("User Address:             ", user.address);
    console.log("Net TAIKO Change:         ", ethers.formatEther(taikoChange), "TAIKO");
    console.log("Net BRIGADE Change:       ", ethers.formatEther(brigadeChange), "BRIGADE");
    console.log("═══════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;