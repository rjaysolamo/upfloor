# Deployment Guide

## Quick Start

### Step 1: Deploy Factory

```bash
npx hardhat run scripts/factorydeployer.js --network <network-name>
```

**Example:**
```bash
npx hardhat run scripts/factorydeployer.js --network sepolia
```

**Output:**
```
🏭 UpFloor Strategy Factory Deployment
========================================
Factory deployed to: 0x1234...5678
✅ Factory Deployment Complete!
```

---

### Step 2: Deploy Token via Factory

1. **Edit `scripts/tokendeployer.js`** configuration:

```javascript
const CONFIG = {
    // Paste factory address from Step 1
    factoryAddress: "0x1234...5678",
    
    // Your token details
    tokenName: "XYZ Token",
    tokenSymbol: "XYZ",
    
    // NFT collection address
    nftCollectionAddress: "0xYourNFTCollection...",
    
    // Collection owner (receives royalties)
    collectionOwnerAddress: "0xYourAddress...",
};
```

2. **Run deployment:**

```bash
npx hardhat run scripts/tokendeployer.js --network <network-name>
```

**Example:**
```bash
npx hardhat run scripts/tokendeployer.js --network sepolia
```

**Output:**
```
🪙 UpFloor Token Deployment via Factory
========================================
📍 Token Address: 0xABC...
📍 Router Address: 0xDEF...
📍 Strategy Address: 0x123...
✅ Token Deployment Complete!
```

---

## Deployment Flow Diagram

```
Step 1: Deploy Factory
────────────────────────
npx hardhat run scripts/factorydeployer.js
        ↓
   Factory Address: 0x...
        ↓
   (Save this address!)


Step 2: Deploy Token
────────────────────────
Edit CONFIG in tokendeployer.js
        ↓
npx hardhat run scripts/tokendeployer.js
        ↓
   Deploys 3 contracts:
   - Token (UpFloorToken)
   - Router (MintRouter)
   - Strategy (UpFloorStrategy)
        ↓
   All connected automatically!
```

---

## Configuration Options

### Factory Deployment
No configuration needed! Just run the script.

### Token Deployment
Edit these values in `tokendeployer.js`:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `factoryAddress` | Factory deployed in Step 1 | `0x1234...5678` |
| `tokenName` | Full token name | `"My Cool Token"` |
| `tokenSymbol` | Token ticker | `"MCT"` |
| `nftCollectionAddress` | NFT collection to trade | `0xNFT...` |
| `collectionOwnerAddress` | Royalty recipient | `0xOwner...` |

---

## Network Configuration

### Hardhat Local
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/factorydeployer.js --network localhost
npx hardhat run scripts/tokendeployer.js --network localhost
```

### Testnet (Sepolia, Arbitrum Sepolia, etc.)
```bash
# Make sure hardhat.config.js has network configured
npx hardhat run scripts/factorydeployer.js --network sepolia
npx hardhat run scripts/tokendeployer.js --network sepolia
```

### Mainnet
```bash
# ⚠️ REAL MONEY! Double check everything!
npx hardhat run scripts/factorydeployer.js --network mainnet
npx hardhat run scripts/tokendeployer.js --network mainnet
```

---

## After Deployment

### What You Get

**From Factory Deployment:**
- ✅ Factory contract address
- ✅ Saved to `deploymentData/<network>-factory-deployment.json`

**From Token Deployment:**
- ✅ Token contract address
- ✅ Router contract address (for easy minting)
- ✅ Strategy contract address (for auctions)
- ✅ Solver address pre-configured: `0x3E774175d1b550A9FFb688865a09e60fC1216341`
- ✅ Saved to `deploymentData/<network>-<symbol>-deployment.json`

### Automatic Setup

The factory automatically:
1. ✅ Deploys all 3 contracts
2. ✅ Links Token → Strategy
3. ✅ Transfers ownership to deployer
4. ✅ Sets solver address
5. ✅ Connects everything properly

### Next Steps

1. **Mint Tokens:**
   ```javascript
   await router.mint(amount, receiver, { value: price });
   ```

2. **Solver Operations:**
   - Buy NFTs via Seaport
   - Transfer to Strategy
   - Propose auctions

3. **Owner Operations:**
   - Approve/reject proposals
   - Manage strategy settings

---

## Verification

After deployment, verify contracts on block explorer:

```bash
# The script will output verification commands
# Just copy and run them!

# Example:
npx hardhat verify --network sepolia 0xTokenAddress "Token Name" "SYMBOL" ...
```

---

## Troubleshooting

### "Please set factoryAddress in CONFIG"
➜ Edit `tokendeployer.js` and paste factory address from Step 1

### "Insufficient funds"
➜ Make sure deployer account has enough ETH for gas

### "Invalid NFT collection address"
➜ Verify the NFT collection address is correct and deployed

### "Transaction reverted"
➜ Check:
- All addresses are valid
- Token name/symbol not empty
- Collection owner address is not zero address

---

## Example: Complete Deployment

```bash
# 1. Deploy Factory
$ npx hardhat run scripts/factorydeployer.js --network sepolia
Factory deployed to: 0x1234567890abcdef...

# 2. Edit tokendeployer.js
# - Set factoryAddress: "0x1234567890abcdef..."
# - Set tokenName: "My NFT Token"
# - Set tokenSymbol: "MNFT"
# - Set nftCollectionAddress: "0xYourNFT..."
# - Set collectionOwnerAddress: "0xYourAddress..."

# 3. Deploy Token
$ npx hardhat run scripts/tokendeployer.js --network sepolia
Token deployed to: 0xABCDEF...
Router deployed to: 0xDEF123...
Strategy deployed to: 0x789ABC...

# 4. Done! 🎉
```

---

## Files Created

After deployment, check `deploymentData/` folder:
- `<network>-factory-deployment.json` - Factory info
- `<network>-<symbol>-deployment.json` - Token system info

---

## Support

For issues or questions, check:
- Contract code in `contracts/`
- Test files in `test/`
- Documentation in project root

