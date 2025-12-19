# UpFloorToken Reward Mechanism Tests

This directory contains comprehensive tests for the UpFloorToken reward mechanism.

## Test Files

### `RewardMechanism.test.js`
Comprehensive Hardhat test suite that covers:
- ✅ Reward payment to non-owner/non-solver addresses
- ✅ No rewards for owner and solver addresses
- ✅ Configurable reward percentage (1-10%)
- ✅ Target restrictions (only Seaport, Strategy, Collection)
- ✅ Self-call prevention
- ✅ Edge cases and error handling

### `scripts/testRewardMechanism.js`
Standalone test script that demonstrates the reward mechanism in action with detailed console output.

## Running Tests

### Run Hardhat Tests
```bash
# Run all reward mechanism tests
npm run test:rewards

# Run all tests
npm test
```

### Run Standalone Test Script
```bash
# Run the standalone demonstration script
npm run test:rewards:standalone
```

## Test Results

The tests verify that:

1. **Anyone can call `executeExternalCall`** - No authorization restrictions
2. **Rewards are paid correctly** - 1% of ETH value by default
3. **Owner and solver are excluded** - They don't receive rewards
4. **Reward percentage is configurable** - Can be set from 1% to 10%
5. **Target restrictions work** - Only allows calls to Seaport, Strategy, or Collection
6. **Self-calls are prevented** - Cannot call the contract itself
7. **Edge cases are handled** - Zero values, insufficient funds, etc.

## Key Features Tested

- **Reward Calculation**: `rewardAmount = (callValue * rewardPercentage) / 10000`
- **Exclusion Logic**: Owner and solver addresses don't receive rewards
- **Safety Checks**: Continues execution even if insufficient funds for reward
- **Event Emission**: `RewardPaid` event is emitted when rewards are paid
- **Configuration**: `setRewardPercentage()` function with validation

## Example Output

```
🎯 Test 2: User1 calls executeExternalCall (should receive reward)
   User1 balance before: 10000.0 ETH
   Call value: 1.0 ETH
   Expected reward: 0.01 ETH
   Actual balance change: 0.01 ETH
   ✅ User1 received reward as expected!
```

The reward mechanism successfully incentivizes users to trigger external calls while maintaining security through target restrictions.
