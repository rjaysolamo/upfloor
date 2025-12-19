const { ethers } = require("hardhat");

// Configuration
const TOKEN_ADDRESS = "0x10075Ed58bD714e8b0b04B630A1EF704A29d8D62"; // Brigade token
const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"; // TAIKO token
const BRIGADE_AMOUNT = "0.1"; // Amount of BRIGADE tokens to redeem
const CONVERT_TO_TAIKO = true; // Set to false if you just want ETH

// Uniswap V2 Router on Taiko (if available) - you may need to update this
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Generic Uniswap V2 router

async function main() {
    console.log("\n🔄 Redeeming BRIGADE tokens...\n");

    const [redeemer] = await ethers.getSigners();
    console.log("Redeemer account:", redeemer.address);

    // Connect to contracts
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    
    const taikoTokenABI = [
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)"
    ];
    const taikoToken = new ethers.Contract(TAIKO_TOKEN_ADDRESS, taikoTokenABI, redeemer);

    const brigadeAmount = ethers.parseEther(BRIGADE_AMOUNT);

    // Check BRIGADE balance
    const brigadeBalance = await token.balanceOf(redeemer.address);
    console.log("Your BRIGADE balance:", ethers.formatEther(brigadeBalance), "BRIGADE");
    
    // Check initial TAIKO balance
    const initialTaikoBalance = await taikoToken.balanceOf(redeemer.address);
    console.log("Your TAIKO balance:", ethers.formatEther(initialTaikoBalance), "TAIKO\n");

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
    console.log("\n📝 Step 1: Redeeming BRIGADE tokens for ETH");
    console.log("  Redeeming", BRIGADE_AMOUNT, "BRIGADE tokens");

    let ethReceived = 0n;

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
            ethReceived = parsedEvent.args.assets;

            console.log("\n🎉 Redemption Details:");
            console.log("  Tokens redeemed:", ethers.formatEther(tokensRedeemed), "BRIGADE");
            console.log("  ETH received:", ethers.formatEther(ethReceived), "ETH");
        }

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

    // Step 2: Convert ETH to TAIKO (if requested)
    if (CONVERT_TO_TAIKO && ethReceived > 0n) {
        console.log("\n📝 Step 2: Converting ETH to TAIKO tokens");
        console.log("  ⚠️  Note: This requires a DEX with ETH/TAIKO pair");
        console.log("  💡 Alternative: You can manually swap ETH to TAIKO on a DEX");
        console.log("  💡 Or use the TAIKO bridge if available");
        
        // For now, we'll just show the manual steps since DEX integration
        // requires specific router addresses and may not be available
        console.log("\n📋 Manual conversion steps:");
        console.log("  1. Go to a DEX like Uniswap or SushiSwap on Taiko");
        console.log("  2. Swap", ethers.formatEther(ethReceived), "ETH for TAIKO tokens");
        console.log("  3. Or use the official TAIKO bridge/faucet");
        
        // Uncomment and modify this section if you have a working DEX router
        /*
        try {
            const routerABI = [
                "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)"
            ];
            const router = new ethers.Contract(UNISWAP_ROUTER, routerABI, redeemer);
            
            const path = [
                "0x4200000000000000000000000000000000000006", // WETH on Taiko
                TAIKO_TOKEN_ADDRESS
            ];
            
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
            const minTaikoOut = 0; // Set appropriate slippage
            
            const swapTx = await router.swapExactETHForTokens(
                minTaikoOut,
                path,
                redeemer.address,
                deadline,
                { value: ethReceived }
            );
            
            console.log("  Swap transaction hash:", swapTx.hash);
            await swapTx.wait();
            console.log("  ✅ ETH swapped to TAIKO successfully!");
            
        } catch (error) {
            console.log("  ❌ Automatic swap failed:", error.message);
            console.log("  💡 Please swap manually on a DEX");
        }
        */
    }

    // Check final balances
    const newBrigadeBalance = await token.balanceOf(redeemer.address);
    const newEthBalance = await ethers.provider.getBalance(redeemer.address);
    const newTaikoBalance = await taikoToken.balanceOf(redeemer.address);

    console.log("\n💼 Your final balances:");
    console.log("  BRIGADE:", ethers.formatEther(newBrigadeBalance), "BRIGADE");
    console.log("  ETH:", ethers.formatEther(newEthBalance), "ETH");
    console.log("  TAIKO:", ethers.formatEther(newTaikoBalance), "TAIKO");

    const ethGained = newEthBalance - initialEthBalance;
    const taikoGained = newTaikoBalance - initialTaikoBalance;
    
    console.log("\n📈 Changes:");
    console.log("  ETH gained:", ethers.formatEther(ethGained), "ETH");
    console.log("  TAIKO gained:", ethers.formatEther(taikoGained), "TAIKO");

    // Check new supply
    const newSupply = await token.totalSupply();
    console.log("\n📊 New total supply:", ethers.formatEther(newSupply), "BRIGADE");

    console.log("\n✅ Redemption complete!\n");

    console.log("═══════════════════════════════════════════════════");
    console.log("📋 REDEMPTION SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("Token:                 BrigadeAssets (BRIGADE)");
    console.log("Redemption Method:     Burn BRIGADE for ETH");
    console.log("Token Contract:        ", TOKEN_ADDRESS);
    console.log("Redeemer:              ", redeemer.address);
    console.log("BRIGADE Redeemed:      ", BRIGADE_AMOUNT, "BRIGADE");
    console.log("ETH Received:          ", ethers.formatEther(ethReceived), "ETH");
    console.log("═══════════════════════════════════════════════════");
    console.log("\n🔗 View Token on Taikoscan:");
    console.log(`https://taikoscan.io/address/${TOKEN_ADDRESS}`);
    console.log("\n🔗 View Your Wallet:");
    console.log(`https://taikoscan.io/address/${redeemer.address}`);
    
    if (CONVERT_TO_TAIKO) {
        console.log("\n💡 To convert ETH to TAIKO:");
        console.log("🔗 Taiko Bridge: https://bridge.taiko.xyz/");
        console.log("🔗 DEX Options: Check for Uniswap, SushiSwap, or other DEXs on Taiko");
    }
    
    console.log("═══════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = main;