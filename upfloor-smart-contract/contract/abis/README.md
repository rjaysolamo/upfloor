# Frontend ABIs for UpFloor Contracts

This directory contains clean, frontend-ready ABIs for the UpFloor smart contracts deployed on Monad Testnet.

## Available ABIs

### 1. **UpFloorStrategyFactory.abi.json**
Factory contract for deploying new token ecosystems.

**Key Functions:**
- `deployStrategyToken(name, symbol, nftCollection, collectionOwner, royaltyBps)` - Deploy new token
- `getDeploymentFee()` - Get current deployment fee
- `getUserTokens(address)` - Get all tokens deployed by a user
- `getTokenStrategy(address)` - Get strategy contract for a token
- `isDeployedToken(address)` - Check if token was deployed by factory

**Deployed Address (Monad Testnet):**
```
0x2aDD379F855d69cE02CB9EEdBa25b29F683A2008
```

---

### 2. **UpFloorToken.abi.json**
ERC20 token with bonding curve mechanics.

**Key Functions:**

**Trading:**
- `mint(amount, receiver)` - Buy tokens via bonding curve (payable)
- `redeem(amount, from, to, minOut)` - Sell tokens back to curve
- `previewMint(amount)` - Preview ETH cost to mint tokens
- `previewRedeem(amount)` - Preview ETH received when selling tokens

**ERC20 Standard:**
- `balanceOf(address)` - Get token balance
- `transfer(to, amount)` - Transfer tokens
- `approve(spender, amount)` - Approve spending
- `allowance(owner, spender)` - Check allowance

**Token Info:**
- `name()` - Token name
- `symbol()` - Token symbol
- `totalSupply()` - Total supply
- `decimals()` - Token decimals (18)
- `effectiveSupply()` - Circulating supply
- `lockedSupply()` - Locked/burned supply

**Owner Functions:**
- `pause()` / `unpause()` - Emergency pause
- `setRewardPercentage(bps)` - Update reward percentage
- `setCollectionRoyaltyBps(bps)` - Update royalty percentage
- `setStrategy(address)` - Set strategy contract

**Latest Deployment (Monad Testnet):**
```
Token:    0xA96e1cA3029f9E9f943FfC84fA2f8f5d8279928D
Router:   0x3316b7513ED47e092f1E705C4FB0ed7dAFC47B1f
Strategy: 0x19f10296Ec9C358Cb350EeeCbbBF450601a46bEa
```

---

##  Usage Examples

### JavaScript/TypeScript (ethers.js v6)

```javascript
import { ethers } from 'ethers';
import factoryAbi from './abis/UpFloorStrategyFactory.abi.json';
import tokenAbi from './abis/UpFloorToken.abi.json';

// Connect to provider
const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/monad_testnet');
const signer = await provider.getSigner();

// Factory Contract
const factoryAddress = '0x2aDD379F855d69cE02CB9EEdBa25b29F683A2008';
const factory = new ethers.Contract(factoryAddress, factoryAbi, signer);

// Get deployment fee
const fee = await factory.getDeploymentFee();
console.log('Deployment fee:', ethers.formatEther(fee), 'ETH');

// Deploy a new token
const tx = await factory.deployStrategyToken(
  'MyToken',
  'MTK',
  nftCollectionAddress,
  royaltyRecipient,
  300, // 3% royalty
  { value: fee }
);
const receipt = await tx.wait();
console.log('Token deployed!');

// Token Contract
const tokenAddress = '0xA96e1cA3029f9E9f943FfC84fA2f8f5d8279928D';
const token = new ethers.Contract(tokenAddress, tokenAbi, signer);

// Preview mint cost
const amount = ethers.parseEther('100'); // 100 tokens
const cost = await token.previewMint(amount);
console.log('Cost to mint 100 tokens:', ethers.formatEther(cost), 'ETH');

// Mint tokens
const mintTx = await token.mint(amount, signer.address, { value: cost });
await mintTx.wait();
console.log('Minted 100 tokens!');

// Check balance
const balance = await token.balanceOf(signer.address);
console.log('Balance:', ethers.formatEther(balance));

// Redeem (sell) tokens
const sellAmount = ethers.parseEther('50');
const expectedETH = await token.previewRedeem(sellAmount);
const redeemTx = await token.redeem(
  sellAmount,
  signer.address,
  signer.address,
  expectedETH * 95n / 100n // 5% slippage tolerance
);
await redeemTx.wait();
console.log('Redeemed 50 tokens for', ethers.formatEther(expectedETH), 'ETH');
```

### React Hook Example

```typescript
import { useContract, useSigner } from 'wagmi';
import factoryAbi from './abis/UpFloorStrategyFactory.abi.json';
import tokenAbi from './abis/UpFloorToken.abi.json';

function useUpFloorFactory() {
  const { data: signer } = useSigner();
  
  const factory = useContract({
    address: '0x2aDD379F855d69cE02CB9EEdBa25b29F683A2008',
    abi: factoryAbi,
    signerOrProvider: signer,
  });
  
  return factory;
}

function useUpFloorToken(tokenAddress: string) {
  const { data: signer } = useSigner();
  
  const token = useContract({
    address: tokenAddress,
    abi: tokenAbi,
    signerOrProvider: signer,
  });
  
  return token;
}

// Usage in component
function MintTokens() {
  const token = useUpFloorToken('0xA96e1cA3029f9E9f943FfC84fA2f8f5d8279928D');
  
  const handleMint = async (amount: string) => {
    const amountWei = ethers.parseEther(amount);
    const cost = await token.previewMint(amountWei);
    
    const tx = await token.mint(amountWei, userAddress, { value: cost });
    await tx.wait();
  };
  
  return <button onClick={() => handleMint('100')}>Mint 100 Tokens</button>;
}
```

---

##  Constants & Configuration

**Monad Testnet:**
- Chain ID: `10143`
- RPC URL: `https://rpc.ankr.com/monad_testnet`
- Currency: MON (Monad)

**Token Decimals:** 18

**Basis Points Reference:**
- 100 BPS = 1%
- 300 BPS = 3%
- 1000 BPS = 10%
- 10000 BPS = 100%

---

## å Contract Addresses

### Factory
```
0x2aDD379F855d69cE02CB9EEdBa25b29F683A2008
```

### Latest Token Deployment (testoketne)
```
Token:    0xA96e1cA3029f9E9f943FfC84fA2f8f5d8279928D
Router:   0x3316b7513ED47e092f1E705C4FB0ed7dAFC47B1f
Strategy: 0x19f10296Ec9C358Cb350EeeCbbBF450601a46bEa
```

---

##  Notes

- All amounts are in wei (use `ethers.parseEther()` to convert from ETH)
- Token has 18 decimals (same as ETH)
- Always preview mint/redeem costs before executing transactions
- Use slippage tolerance when redeeming tokens
- Factory deployment requires payment of deployment fee

---

##  Development

To update ABIs after contract changes:
```bash
npx hardhat compile
# ABIs are in artifacts/contracts/
```

To deploy new tokens:
```bash
npx hardhat run scripts/deployToken.js --network monadtestnet
```

