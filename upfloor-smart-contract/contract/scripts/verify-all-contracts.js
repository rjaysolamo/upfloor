const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load deployment data
  const deploymentPath = path.join(__dirname, "../deploymentData/taiko-brigade-deployment-1761792600638.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("🔍 Verifying contracts on Taiko Alethia...\n");
  console.log("Network:", deployment.network);
  console.log("Chain ID:", deployment.chainId);
  console.log("Deployer:", deployment.deployer);
  console.log("\n" + "=".repeat(60) + "\n");

  const contractsToVerify = [
    {
      name: "UpFloorStrategyFactory",
      address: deployment.contracts.factory,
      constructorArgs: []
    },
    {
      name: "UpFloorToken",
      address: deployment.contracts.token,
      constructorArgs: [
        deployment.collection.nftCollection,
        deployment.collection.collectionOwner,
        deployment.collection.royaltyRecipient,
        deployment.collection.royaltyBps
      ]
    },
    {
      name: "MintRouter",
      address: deployment.contracts.router,
      constructorArgs: [deployment.contracts.token]
    },
    {
      name: "UpFloorStrategy",
      address: deployment.contracts.strategy,
      constructorArgs: [
        deployment.contracts.token,
        deployment.taiko.marketplace,
        deployment.taiko.paymentToken
      ]
    }
  ];

  const results = [];
  
  for (const contract of contractsToVerify) {
    console.log(`📝 Submitting ${contract.name} for verification...`);
    console.log(`   Address: ${contract.address}`);
    
    try {
      const result = hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArgs,
        network: "taikoalethia"
      }).then(() => {
        console.log(`✅ ${contract.name} verified!`);
        return { contract: contract.name, status: "success" };
      }).catch((error) => {
        if (error.message.includes("Already Verified")) {
          console.log(`✅ ${contract.name} already verified!`);
          return { contract: contract.name, status: "already verified" };
        } else {
          console.log(`❌ ${contract.name} error: ${error.message.split('\n')[0]}`);
          return { contract: contract.name, status: "error", error: error.message };
        }
      });
      
      results.push(result);
    } catch (error) {
      console.log(`❌ Error submitting ${contract.name}: ${error.message}\n`);
    }
  }
  
  console.log("\n⏳ Waiting for all verifications to complete...\n");
  await Promise.all(results);

  console.log("=".repeat(60));
  console.log("\n🎉 Verification process complete!");
  console.log("\n📊 View contracts on Taikoscan:");
  console.log(`   Factory: https://taikoscan.io/address/${deployment.contracts.factory}`);
  console.log(`   Token: https://taikoscan.io/address/${deployment.contracts.token}`);
  console.log(`   Router: https://taikoscan.io/address/${deployment.contracts.router}`);
  console.log(`   Strategy: https://taikoscan.io/address/${deployment.contracts.strategy}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
