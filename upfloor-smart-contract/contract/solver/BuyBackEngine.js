require('dotenv').config();
const { OpenSeaSDK, Chain } = require("opensea-js");
const { ethers } = require("ethers");

async function buyNFTWithContractPayment() {
  try {
    console.log("🚀 Starting NFT purchase with contract payment on Arbitrum...\n");

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://arb1.arbitrum.io/rpc");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Contract that will pay for the NFT
    const PAYMENT_CONTRACT = "0x94f2C8ad410Fde86e815bEe2238Ea6c76f9622ed";

    console.log("Wallet Address:", wallet.address);
    console.log("Payment Contract:", PAYMENT_CONTRACT);

    // Check wallet balance (for gas)
    const walletBalance = await provider.getBalance(wallet.address);
    console.log("Wallet Balance (for gas):", ethers.formatEther(walletBalance), "ETH");

    // Check contract balance (for NFT payment)
    const contractBalance = await provider.getBalance(PAYMENT_CONTRACT);
    console.log("Contract Balance (for NFT):", ethers.formatEther(contractBalance), "ETH\n");

    // Initialize OpenSea SDK
    const openseaSDK = new OpenSeaSDK(wallet, {
      chain: Chain.Arbitrum,
      apiKey: process.env.OPENSEA_API_KEY, // Optional
    });

    // NFT details
    const nftContract = "0x7Ae207D6238330b160566068728d29394Db5f2BE";

    console.log("NFT Contract:", nftContract);
    console.log("Searching for available NFTs...");
    console.log("---");

    // Try different token IDs to find one that's available
    const tokenIdsToTry = ["14", "18"];
    let orders = null;
    let bestOrder = null;
    let actualTokenId = null;

    for (const tokenId of tokenIdsToTry) {
      try {
        console.log(`📋 Trying token ID ${tokenId}...`);
        
        const { orders: tokenOrders } = await openseaSDK.api.getOrders({
      assetContractAddress: nftContract,
      tokenId: tokenId,
      side: "ask",
      orderBy: "eth_price",
      orderDirection: "asc",
    });

        if (tokenOrders && tokenOrders.length > 0) {
          orders = tokenOrders;
          bestOrder = tokenOrders[0];
          actualTokenId = tokenId;
          console.log(`✅ Found order for token ID ${tokenId}`);
          break;
        } else {
          console.log(`❌ No orders found for token ID ${tokenId}`);
        }
      } catch (error) {
        console.log(`❌ Error checking token ID ${tokenId}:`, error.message);
        continue;
      }
    }

    if (!orders || !bestOrder) {
      throw new Error("No available orders found for any token ID in this collection");
    }

    console.log(`Found ${orders.length} order(s)\n`);

    const nftPrice = bestOrder.currentPrice;

    console.log("📊 Best Order Details:");
    console.log("  Token ID:", actualTokenId);
    console.log("  Order Hash:", bestOrder.orderHash);
    console.log("  Maker:", bestOrder.maker?.address);
    console.log("  Price:", nftPrice, "wei");
    console.log("  Price (ETH):", ethers.formatEther(nftPrice), "ETH");
    console.log("  Expiration:", new Date(bestOrder.expirationTime * 1000).toLocaleString());
    console.log("---");

    // Check if contract has enough balance
    if (contractBalance < nftPrice) {
      throw new Error(`Contract has insufficient balance. Required: ${ethers.formatEther(nftPrice)} ETH, Available: ${ethers.formatEther(contractBalance)} ETH`);
    }

    // Create the LemonFunToken contract instance
    const lemonFunTokenABI = [
      "function executeExternalCall(address target, uint256 value, bytes calldata data) external returns (bytes memory)"
    ];
    
    const lemonFunToken = new ethers.Contract(PAYMENT_CONTRACT, lemonFunTokenABI, wallet);

    // Get the fulfillment data from OpenSea SDK
    console.log("🔧 Getting fulfillment data from OpenSea...");
    
    const fulfillmentData = await openseaSDK.api.generateFulfillmentData(
      PAYMENT_CONTRACT, // Use contract address as the fulfiller
      bestOrder.orderHash,
      bestOrder.protocolAddress,
      bestOrder.side
    );

    console.log("📝 Generated fulfillment data");

    // Extract the transaction data
    const fulfillmentTransaction = fulfillmentData.fulfillment_data.transaction;
    
    if (!fulfillmentTransaction) {
      throw new Error("No fulfillment transaction data received from OpenSea");
    }

    console.log("🎯 Fulfillment Details:");
    console.log("  Target:", fulfillmentTransaction.to);
    console.log("  Value:", fulfillmentTransaction.value || "0", "wei");
    console.log("  Data Length:", fulfillmentTransaction.data ? fulfillmentTransaction.data.length : "undefined", "chars");
    console.log("  Full fulfillment data:", JSON.stringify(fulfillmentData, null, 2));
    
    if (!fulfillmentTransaction.data) {
      console.log("⚠️  No transaction data found, trying alternative approach...");
      // We need to manually construct the Seaport call data since OpenSea SDK doesn't provide it
      console.log("🔄 Building Seaport call manually...");
      
      // Get the Seaport contract ABI for fulfillBasicOrder_efficient_6GL6yc
      const seaportABI = [
        `function fulfillBasicOrder_efficient_6GL6yc(
          (
            address,
            uint256,
            uint256,
            address,
            address,
            address,
            uint256,
            uint256,
            uint8,
            uint256,
            uint256,
            bytes32,
            uint256,
            bytes32,
            bytes32,
            uint256,
            (uint256,address)[],
            bytes
          ) parameters
        ) external payable returns (bool)`
      ];
      
      const seaportInterface = new ethers.Interface(seaportABI);
      

      const params = fulfillmentTransaction.input_data.parameters;
      

      const additionalRecipientsTuples = params.additionalRecipients.map(recipient => [
        recipient.amount,
        recipient.recipient
      ]);
      
      const seaportParams = [
        params.considerationToken,
        params.considerationIdentifier,
        params.considerationAmount,
        params.offerer,
        params.zone,
        params.offerToken,
        params.offerIdentifier,
        params.offerAmount,
        params.basicOrderType,
        params.startTime,
        params.endTime,
        params.zoneHash,
        params.salt,
        params.offererConduitKey,
        params.fulfillerConduitKey,
        params.totalOriginalAdditionalRecipients,
        additionalRecipientsTuples,
        params.signature
      ];
      

      const calldata = seaportInterface.encodeFunctionData("fulfillBasicOrder_efficient_6GL6yc", [seaportParams]);
      
      console.log("🎯 Seaport Call Details:");
      console.log("  Target:", fulfillmentTransaction.to);
      console.log("  Value:", fulfillmentTransaction.value, "wei");
      console.log("  Calldata Length:", calldata.length, "chars");
      

      console.log("💰 Executing purchase via contract...\n");

      const tx = await lemonFunToken.executeExternalCall(
        fulfillmentTransaction.to,
        fulfillmentTransaction.value, // The contract will pay this amount
        calldata,
        {
          gasLimit: 500000, // Set a reasonable gas limit
        }
      );

      console.log("✅ Transaction submitted!");
      console.log("Transaction Hash:", tx.hash);
      console.log("Waiting for confirmation...\n");

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        console.error("❌ Transaction failed!");
        throw new Error("Transaction reverted - check order validity or contract approvals");
      }

      console.log("🎉 NFT Purchase Successful!");
      console.log("Block Number:", receipt.blockNumber);
      console.log("Gas Used:", receipt.gasUsed.toString());
      console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

      // Verify ownership
      const nftContractInstance = new ethers.Contract(
        nftContract,
        ["function ownerOf(uint256) view returns (address)"],
        provider
      );

      const newOwner = await nftContractInstance.ownerOf(actualTokenId);
      console.log("\n📦 NFT Owner:", newOwner);
      console.log("Contract owns it:", newOwner.toLowerCase() === PAYMENT_CONTRACT.toLowerCase() ? "Yes! 🎊" : "No");

      // Check final contract balance
      const finalContractBalance = await provider.getBalance(PAYMENT_CONTRACT);
      console.log("Final Contract Balance:", ethers.formatEther(finalContractBalance), "ETH");
      console.log("Amount Spent:", ethers.formatEther(contractBalance - finalContractBalance), "ETH");
      
      return; // Exit early since we used the contract approach
    }

    // Execute the external call through the LemonFunToken contract
    console.log("💰 Executing purchase via contract...\n");

    const tx = await lemonFunToken.executeExternalCall(
      fulfillmentTransaction.to,
      fulfillmentTransaction.value || nftPrice, // Use the value from fulfillment or fallback to NFT price
      fulfillmentTransaction.data,
      {
        gasLimit: 500000, // Set a reasonable gas limit
      }
    );

    console.log("✅ Transaction submitted!");
    console.log("Transaction Hash:", tx.hash);
    console.log("Waiting for confirmation...\n");

    const receipt = await tx.wait();

    if (receipt.status === 0) {
      console.error("❌ Transaction failed!");
      throw new Error("Transaction reverted - check order validity or contract approvals");
    }

    console.log("🎉 NFT Purchase Successful!");
    console.log("Block Number:", receipt.blockNumber);
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

    // Verify ownership
    const nftContractInstance = new ethers.Contract(
      nftContract,
      ["function ownerOf(uint256) view returns (address)"],
      provider
    );

    const newOwner = await nftContractInstance.ownerOf(actualTokenId);
    console.log("\n📦 NFT Owner:", newOwner);
    console.log("Contract owns it:", newOwner.toLowerCase() === PAYMENT_CONTRACT.toLowerCase() ? "Yes! 🎊" : "No");

    // Check final contract balance
    const finalContractBalance = await provider.getBalance(PAYMENT_CONTRACT);
    console.log("Final Contract Balance:", ethers.formatEther(finalContractBalance), "ETH");
    console.log("Amount Spent:", ethers.formatEther(contractBalance - finalContractBalance), "ETH");

  } catch (error) {
    console.error("\n❌ Error:", error.message);

    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error("Insufficient funds to complete the transaction");
    } else if (error.code === 'NETWORK_ERROR') {
      console.error("Network error - check your RPC connection");
    } else if (error.response) {
      console.error("API Error:", error.response.data || error.response);
    }

    throw error;
  }
}

// Run the script directly
(async () => {
  await buyNFTWithContractPayment();
  console.log("\n✨ Script completed!");
})();
