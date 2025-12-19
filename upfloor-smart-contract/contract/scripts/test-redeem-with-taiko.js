const { ethers } = require("hardhat");

const TOKEN_ADDRESS = "0x10075Ed58bD714e8b0b04B630A1EF704A29d8D62";

async function main() {
    console.log("🧪 Testing redeemWithTaiko function\n");

    const [user] = await ethers.getSigners();
    const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);

    try {
        // Try to call the function to see if it exists
        console.log("Checking if redeemWithTaiko function exists...");
        
        // This will throw if the function doesn't exist
        const testAmount = ethers.parseEther("0.001");
        await token.redeemWithTaiko.staticCall(
            testAmount,
            user.address,
            user.address,
            0
        );
        
        console.log("✅ redeemWithTaiko function exists!");
        console.log("💡 You can use the redeemWithTaiko function");
        
    } catch (error) {
        if (error.message.includes("no matching function")) {
            console.log("❌ redeemWithTaiko function does not exist");
            console.log("💡 Need to deploy updated contract");
        } else if (error.message.includes("InsufficientETH") || error.message.includes("BadAmount")) {
            console.log("✅ redeemWithTaiko function exists!");
            console.log("💡 Function exists but failed due to parameters (this is expected)");
        } else {
            console.log("❌ Error testing function:", error.message);
        }
    }

    // Also check what functions are available
    console.log("\n📋 Available functions:");
    const fragment = token.interface.fragments;
    const functions = fragment.filter(f => f.type === 'function').map(f => f.name);
    
    const redeemFunctions = functions.filter(name => name.includes('redeem'));
    console.log("Redeem functions:", redeemFunctions);
}

main().catch(console.error);