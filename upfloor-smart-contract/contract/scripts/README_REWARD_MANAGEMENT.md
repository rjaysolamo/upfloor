# UpFloor Token Reward Management

This guide explains how project owners can set and manage reward percentages for the UpFloor Token system.

## 🎯 Overview

The UpFloor Token has a built-in reward mechanism that incentivizes users to call `executeExternalCall()`. Only the contract owner can set the reward percentage.

## 🔧 How to Set Rewards

### Method 1: Using the Reward Manager Script (Recommended)

```bash
# Set TOKEN_ADDRESS environment variable
export TOKEN_ADDRESS=0x1234567890123456789012345678901234567890

# Show current reward settings
npm run reward-manager status

# Set reward to 2% (200 basis points)
npm run reward-manager set 200

# Simulate reward calculation
npm run reward-manager simulate 1.5
```

### Method 2: Using the Simple Script

```bash
# Set environment variables
export TOKEN_ADDRESS=0x1234567890123456789012345678901234567890
export REWARD_PERCENTAGE=200

# Run the script
npm run set-reward
```

### Method 3: Direct Contract Interaction

```javascript
const { ethers } = require("hardhat");

async function setReward() {
  const token = await ethers.getContractAt("UpFloorToken", TOKEN_ADDRESS);
  
  // Set reward to 2% (200 basis points)
  const tx = await token.setRewardPercentage(200);
  await tx.wait();
  
  console.log("Reward percentage updated!");
}
```

## 📊 Reward System Details

### How Rewards Work

1. **Anyone can call** `executeExternalCall()`
2. **Rewards are paid** to non-owner addresses only
3. **Reward calculation**: `rewardAmount = (ETH value × reward %) ÷ 10000`
4. **Target restrictions**: Only Seaport, Strategy, or Collection contracts

### Reward Percentage Limits

- **Minimum**: 0 basis points (0%)
- **Maximum**: 1000 basis points (10%)
- **Default**: 100 basis points (1%)

### Examples

| ETH Value | 1% Reward | 2% Reward | 5% Reward |
|-----------|-----------|-----------|-----------|
| 0.1 ETH   | 0.001 ETH | 0.002 ETH | 0.005 ETH |
| 1 ETH     | 0.01 ETH  | 0.02 ETH  | 0.05 ETH  |
| 5 ETH     | 0.05 ETH  | 0.1 ETH   | 0.25 ETH  |
| 10 ETH    | 0.1 ETH   | 0.2 ETH   | 0.5 ETH   |

## 🛠️ Available Scripts

### 1. `reward-manager` - Full-featured management tool

```bash
# Show current status
npm run reward-manager status

# Set new reward percentage
npm run reward-manager set 200

# Simulate reward calculation
npm run reward-manager simulate 1.5
npm run reward-manager simulate 2.0 0x1234...
```

### 2. `set-reward` - Simple reward setting

```bash
# Set environment variables and run
TOKEN_ADDRESS=0x... REWARD_PERCENTAGE=200 npm run set-reward
```

### 3. `rewardExample` - Educational example

```bash
# Run the example (update TOKEN_ADDRESS in script first)
npx hardhat run scripts/rewardExample.js --network hardhat
```

## 🔐 Security Considerations

### Owner-Only Functions

Only the contract owner can:
- ✅ Set reward percentage
- ✅ Update Seaport address
- ✅ Pause/unpause contract
- ✅ Transfer ownership

### Access Control

```solidity
function setRewardPercentage(uint256 newRewardPercentage) external onlyOwner {
    if (newRewardPercentage > MAX_REWARD_PERCENTAGE) revert InvalidRewardPercentage();
    // ... update logic
}
```

## 📋 Step-by-Step Guide

### 1. Deploy Your Contracts

```bash
# Deploy using the factory
npm run deploy
```

### 2. Get Your Token Address

After deployment, note the token address from the output.

### 3. Set Environment Variables

```bash
export TOKEN_ADDRESS=0x1234567890123456789012345678901234567890
```

### 4. Check Current Settings

```bash
npm run reward-manager status
```

### 5. Set Reward Percentage

```bash
# Set to 2% (200 basis points)
npm run reward-manager set 200
```

### 6. Verify Changes

```bash
npm run reward-manager status
```

## 🎮 Testing Rewards

### Test the Reward Mechanism

```bash
# Run comprehensive tests
npm run test:rewards

# Run interactive test
npm run test:rewards:standalone
```

### Simulate Rewards

```bash
# Simulate 1 ETH call
npm run reward-manager simulate 1.0

# Simulate with specific caller
npm run reward-manager simulate 2.0 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

## 🚨 Important Notes

### Gas Considerations

- Setting reward percentage costs ~25,000-30,000 gas
- Higher reward percentages may increase gas costs for `executeExternalCall`

### Economic Considerations

- Higher rewards = more incentive for users
- Higher rewards = more ETH outflow from contract
- Monitor contract balance to ensure sufficient funds

### Best Practices

1. **Start conservative** - Begin with 1-2% rewards
2. **Monitor usage** - Track how often `executeExternalCall` is used
3. **Adjust gradually** - Increase rewards if needed
4. **Maintain balance** - Ensure contract has enough ETH for rewards

## 🔍 Troubleshooting

### Common Issues

**"caller is not the owner"**
- Solution: Make sure you're using the owner account

**"InvalidRewardPercentage"**
- Solution: Reward percentage must be ≤ 1000 basis points (10%)

**"call revert exception"**
- Solution: Check if token address is correct

**"insufficient funds"**
- Solution: Ensure contract has enough ETH for rewards

### Getting Help

1. Check the contract owner: `await token.owner()`
2. Verify token address is correct
3. Ensure you have sufficient ETH for gas
4. Check contract balance: `await ethers.provider.getBalance(tokenAddress)`

## 📈 Monitoring

### Key Metrics to Track

- Contract ETH balance
- Reward percentage setting
- Number of `executeExternalCall` transactions
- Total rewards paid out
- Average reward per transaction

### Useful Queries

```javascript
// Check contract balance
const balance = await ethers.provider.getBalance(tokenAddress);

// Check current reward percentage
const percentage = await token.getRewardPercentage();

// Check if you're the owner
const owner = await token.owner();
const isOwner = owner.toLowerCase() === yourAddress.toLowerCase();
```

---

**Need help?** Check the test files for examples or run the interactive scripts to understand the system better!
