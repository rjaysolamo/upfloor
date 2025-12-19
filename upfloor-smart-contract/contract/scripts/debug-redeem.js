const { ethers } = require("hardhat");

const TOKEN_ADDRESS = "0x10075Ed58bD714e8b0b04B630A1EF704A29d8D62";
const BRIGADE_AMOUNT = "0.05";

async function main() {
    console.log("🔍 Debugging BRIGADE Redemption\n");

    const [user] = await ethers.getSigners();
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
    
    const amount = ethers.parseEther(BRIGADE_AMOUNT);
    
    console.log("User address:", user.address);
    console.log("Token address:", TOKEN_ADDRESS);
    console.log("Amount to redeem:", ethers.formatEther(amount), "BRIGADE");
    
    // Check contract state
    console.log("\n📊 Contract State:");
    
    try {
        const balance = await token.balanceOf(user.address);
        console.log("✅ User BRIGADE balance:", ethers.formatEther(balance));
        
        const totalSupply = await token.totalSupply();
        console.log("✅ Total supply:", ethers.formatEther(totalSupply));
        
        const contractEthBalance = await ethers.provider.getBalance(TOKEN_ADDRESS);
        console.log("✅ Contract ETH balance:", ethers.formatEther(contractEthBalance));
        
        const isPaused = await token.paused();
        console.log("✅ Contract paused:", isPaused);
        
        // Check if amount is valid
        if (balance < amount) {
            console.log("❌ Insufficient BRIGADE balance");
            return;
        }
        
        if (isPaused) {
            console.log("❌ Contract is paused");
            return;
        }
        
        // Try to preview redemption
        console.log("\n🔍 Testing preview functions:");
        const ethOut = await token.previewRedeem(amount);
        console.log("✅ Preview redeem:", ethers.formatEther(ethOut), "ETH");
        
        // Check if contract has enough ETH
        if (contractEthBalance < ethOut) {
            console.log("❌ Contract has insufficient ETH for redemption");
            console.log("   Required:", ethers.formatEther(ethOut), "ETH");
            console.log("   Available:", ethers.formatEther(contractEthBalance), "ETH");
            return;
        }
        
        // Test with different minOut values
        console.log("\n🔍 Testing redemption parameters:");
        
        const minOut1 = ethOut; // 100% - should fail if price moves
        const minOut2 = (ethOut * 95n) / 100n; // 95% - normal slippage
        const minOut3 = (ethOut * 90n) / 100n; // 90% - high slippage
        const minOut4 = 0n; // 0% - no slippage protection
        
        console.log("Expected ETH out:", ethers.formatEther(ethOut));
        console.log("MinOut 100%:", ethers.formatEther(minOut1));
        console.log("MinOut 95%:", ethers.formatEther(minOut2));
        console.log("MinOut 90%:", ethers.formatEther(minOut3));
        console.log("MinOut 0%:", ethers.formatEther(minOut4));
        
        // Try to call redeem with different parameters to see which one fails
        console.log("\n🧪 Testing redeem call (dry run):");
        
        try {
            // Test with callStatic to see if it would work without actually executing
            await token.redeem.staticCall(amount, user.address, user.address, minOut4);
            console.log("✅ Static call successful - transaction should work");
            
            // Now try the actual transaction with no slippage protection
            console.log("\n📝 Executing redemption...");
            const tx = await token.redeem(amount, user.address, user.address, minOut4);
            console.log("Transaction hash:", tx.hash);
            
            const receipt = await tx.wait();
            console.log("✅ Redemption successful!");
            console.log("Gas used:", receipt.gasUsed.toString());
            
        } catch (staticError) {
            console.log("❌ Static call failed:", staticError.message);
            
            // Try to decode the error
            if (staticError.data) {
                console.log("Error data:", staticError.data);
                
                // Try to decode common errors
                const errorSignatures = {
                    "0x2c5211c6": "BadAmount()",
                    "0x84433609": "Slippage()",
                    "0x356680b7": "InsufficientETH()",
                    "0x3ee5aeb5": "TRANSFER_FAILED()",
                };
                
                const errorSig = staticError.data.slice(0, 10);
                if (errorSignatures[errorSig]) {
                    console.log("Decoded error:", errorSignatures[errorSig]);
                }
            }
            
            // Additional checks
            console.log("\n🔍 Additional diagnostics:");
            
            // Check if user has any allowance issues (shouldn't be needed for redeem)
            const allowance = await token.allowance(user.address, user.address);
            console.log("Self allowance:", ethers.formatEther(allowance));
            
            // Check locked supply
            const lockedSupply = await token.lockedSupply();
            console.log("Locked supply:", ethers.formatEther(lockedSupply));
            
            const effectiveSupply = await token.effectiveSupply();
            console.log("Effective supply:", ethers.formatEther(effectiveSupply));
            
            // Check if there's a reentrancy issue
            console.log("Checking for reentrancy guard...");
        }
        
    } catch (error) {
        console.error("❌ Error during diagnostics:", error.message);
        
        if (error.message.includes("call revert exception")) {
            console.log("💡 The contract call is reverting. Possible causes:");
            console.log("   - Contract is paused");
            console.log("   - Insufficient contract ETH balance");
            console.log("   - Amount is 0 or invalid");
            console.log("   - Slippage protection triggered");
            console.log("   - Reentrancy guard active");
        }
    }
}

main().catch(console.error);