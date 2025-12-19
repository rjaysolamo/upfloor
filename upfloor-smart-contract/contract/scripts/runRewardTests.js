const { exec } = require('child_process');
const path = require('path');

console.log("🧪 Running UpFloorToken Reward Mechanism Tests...\n");

// Run the Hardhat test
const testCommand = `npx hardhat test test/RewardMechanism.test.js --network hardhat`;

exec(testCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Test execution failed: ${error}`);
    return;
  }
  
  if (stderr) {
    console.error(`⚠️  Test warnings/errors: ${stderr}`);
  }
  
  console.log(stdout);
  
  // Check if tests passed
  if (stdout.includes('passing') && !stdout.includes('failing')) {
    console.log("\n🎉 All reward mechanism tests passed!");
  } else {
    console.log("\n❌ Some tests failed. Check the output above.");
  }
});
