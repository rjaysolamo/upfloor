const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UpFloorToken Reward Mechanism", function () {
  let upFloorToken;
  let upFloorStrategy;
  let upFloorStrategyFactory;
  let mockERC721;
  let owner;
  let user1;
  let user2;
  let protocolFeeRecipient;
  let collectionOwner;

  const TOKEN_NAME = "TestToken";
  const TOKEN_SYMBOL = "TEST";
  const INITIAL_ETH = ethers.parseEther("10"); // 10 ETH for testing

  beforeEach(async function () {
    [owner, user1, user2, protocolFeeRecipient, collectionOwner] = await ethers.getSigners();

    // Deploy MockERC721
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    mockERC721 = await MockERC721.deploy("TestNFT", "TNFT");

    // Deploy UpFloorStrategyFactory
    const UpFloorStrategyFactory = await ethers.getContractFactory("UpFloorStrategyFactory");
    upFloorStrategyFactory = await UpFloorStrategyFactory.deploy();

    // Deploy strategy token through factory
    const tx = await upFloorStrategyFactory.deployStrategyToken(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      await mockERC721.getAddress(),
      collectionOwner.address
    );
    const receipt = await tx.wait();
    
    // Extract addresses from events
    const event = receipt.logs.find(log => {
      try {
        const parsed = upFloorStrategyFactory.interface.parseLog(log);
        return parsed.name === "TokenDeployed";
      } catch (e) {
        return false;
      }
    });
    
    const tokenAddress = event.args.token;
    const strategyAddress = event.args.strategy;

    upFloorToken = await ethers.getContractAt("UpFloorToken", tokenAddress);
    upFloorStrategy = await ethers.getContractAt("UpFloorStrategy", strategyAddress);

    // Fund the token contract with ETH for rewards
    await owner.sendTransaction({
      to: await upFloorToken.getAddress(),
      value: INITIAL_ETH
    });
  });

  describe("Reward Mechanism Tests", function () {
    it("Should allow anyone to call executeExternalCall", async function () {
      const callData = "0x"; // Empty call data
      const callValue = ethers.parseEther("0.1");

      // User1 (not owner or solver) should be able to call
      await expect(
        upFloorToken.connect(user1).executeExternalCall(
          await upFloorStrategy.getAddress(),
          callValue,
          callData
        )
      ).to.not.be.reverted;
    });

    it("Should pay reward to non-owner callers", async function () {
      const callData = "0x"; // Empty call data
      const callValue = ethers.parseEther("1"); // 1 ETH
      const expectedReward = ethers.parseEther("0.01"); // 1% of 1 ETH

      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
      
      // Execute call and expect reward
      const tx = await upFloorToken.connect(user1).executeExternalCall(
        await upFloorStrategy.getAddress(),
        callValue,
        callData
      );
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
      const balanceChange = user1BalanceAfter - user1BalanceBefore + gasUsed;

      // Should receive reward (minus gas costs)
      expect(balanceChange).to.be.closeTo(expectedReward, ethers.parseEther("0.001"));
    });

    it("Should NOT pay reward to owner", async function () {
      const callData = "0x";
      const callValue = ethers.parseEther("1");

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await upFloorToken.executeExternalCall(
        await upFloorStrategy.getAddress(),
        callValue,
        callData
      );
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const balanceChange = ownerBalanceAfter - ownerBalanceBefore + gasUsed;

      // Should NOT receive reward (only gas refund)
      expect(balanceChange).to.be.closeTo(0, ethers.parseEther("0.001"));
    });


    it("Should emit RewardPaid event when reward is paid", async function () {
      const callData = "0x";
      const callValue = ethers.parseEther("1");
      const expectedReward = ethers.parseEther("0.01");

      await expect(
        upFloorToken.connect(user1).executeExternalCall(
          await upFloorStrategy.getAddress(),
          callValue,
          callData
        )
      ).to.emit(upFloorToken, "RewardPaid")
        .withArgs(user1.address, expectedReward);
    });

    it("Should NOT emit RewardPaid event for owner", async function () {
      const callData = "0x";
      const callValue = ethers.parseEther("1");

      // Test owner
      await expect(
        upFloorToken.executeExternalCall(
          await upFloorStrategy.getAddress(),
          callValue,
          callData
        )
      ).to.not.emit(upFloorToken, "RewardPaid");
    });

    it("Should calculate correct reward amount based on percentage", async function () {
      const callData = "0x";
      const callValue = ethers.parseEther("2"); // 2 ETH
      const expectedReward = ethers.parseEther("0.02"); // 1% of 2 ETH

      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
      
      const tx = await upFloorToken.connect(user1).executeExternalCall(
        await upFloorStrategy.getAddress(),
        callValue,
        callData
      );
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
      const balanceChange = user1BalanceAfter - user1BalanceBefore + gasUsed;

      expect(balanceChange).to.be.closeTo(expectedReward, ethers.parseEther("0.001"));
    });

    it("Should allow owner to update reward percentage", async function () {
      const newPercentage = 200; // 2%
      
      await expect(
        upFloorToken.setRewardPercentage(newPercentage)
      ).to.emit(upFloorToken, "RewardPercentageUpdated")
        .withArgs(100, newPercentage);

      expect(await upFloorToken.getRewardPercentage()).to.equal(newPercentage);
    });

    it("Should reject invalid reward percentage", async function () {
      const invalidPercentage = 1500; // 15% (exceeds max of 10%)
      
      await expect(
        upFloorToken.setRewardPercentage(invalidPercentage)
      ).to.be.revertedWithCustomError(upFloorToken, "InvalidRewardPercentage");
    });

    it("Should work with updated reward percentage", async function () {
      const newPercentage = 200; // 2%
      await upFloorToken.setRewardPercentage(newPercentage);

      const callData = "0x";
      const callValue = ethers.parseEther("1");
      const expectedReward = ethers.parseEther("0.02"); // 2% of 1 ETH

      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
      
      const tx = await upFloorToken.connect(user1).executeExternalCall(
        await upFloorStrategy.getAddress(),
        callValue,
        callData
      );
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
      const balanceChange = user1BalanceAfter - user1BalanceBefore + gasUsed;

      expect(balanceChange).to.be.closeTo(expectedReward, ethers.parseEther("0.001"));
    });

    it("Should continue execution even if insufficient funds for reward", async function () {
      // Set a high reward percentage
      await upFloorToken.setRewardPercentage(1000); // 10%
      
      // Try to call with a large value that would require a large reward
      const callData = "0x";
      const callValue = ethers.parseEther("5"); // 5 ETH (would need 0.5 ETH reward)
      
      // Should not revert, but should not pay reward
      await expect(
        upFloorToken.connect(user1).executeExternalCall(
          await upFloorStrategy.getAddress(),
          callValue,
          callData
        )
      ).to.not.be.reverted;
    });

    it("Should not pay reward when call value is 0", async function () {
      const callData = "0x";
      const callValue = 0;

      await expect(
        upFloorToken.connect(user1).executeExternalCall(
          await upFloorStrategy.getAddress(),
          callValue,
          callData
        )
      ).to.not.emit(upFloorToken, "RewardPaid");
    });

    it("Should not pay reward when reward percentage is 0", async function () {
      await upFloorToken.setRewardPercentage(0);

      const callData = "0x";
      const callValue = ethers.parseEther("1");

      await expect(
        upFloorToken.connect(user1).executeExternalCall(
          await upFloorStrategy.getAddress(),
          callValue,
          callData
        )
      ).to.not.emit(upFloorToken, "RewardPaid");
    });

    it("Should maintain target restrictions", async function () {
      const callData = "0x";
      const callValue = ethers.parseEther("0.1");

      // Should revert for invalid target
      await expect(
        upFloorToken.connect(user1).executeExternalCall(
          user2.address, // Invalid target
          callValue,
          callData
        )
      ).to.be.revertedWithCustomError(upFloorToken, "InvalidTarget");
    });

    it("Should revert for self-call", async function () {
      const callData = "0x";
      const callValue = ethers.parseEther("0.1");

      await expect(
        upFloorToken.connect(user1).executeExternalCall(
          await upFloorToken.getAddress(), // Self call
          callValue,
          callData
        )
      ).to.be.revertedWithCustomError(upFloorToken, "SelfCall");
    });

    it("Should work with different valid targets", async function () {
      const callData = "0x";
      const callValue = ethers.parseEther("0.1");
      const expectedReward = ethers.parseEther("0.001"); // 1% of 0.1 ETH

      // Test with strategy address (should work)
      await expect(
        upFloorToken.connect(user1).executeExternalCall(
          await upFloorStrategy.getAddress(),
          callValue,
          callData
        )
      ).to.emit(upFloorToken, "RewardPaid")
        .withArgs(user1.address, expectedReward);

      // Test that collection address is allowed as target (even if call fails)
      // The important thing is that the target restriction allows the call
      try {
        await upFloorToken.connect(user2).executeExternalCall(
          await mockERC721.getAddress(),
          0, // 0 value
          "0x" // empty data
        );
      } catch (error) {
        // Expected to fail due to CallFailed, but this proves the target is allowed
        expect(error.message).to.include("CallFailed");
      }
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple consecutive calls", async function () {
      const callData = "0x";
      const callValue = ethers.parseEther("0.5");
      const expectedReward = ethers.parseEther("0.005"); // 1% of 0.5 ETH

      // Make multiple calls
      for (let i = 0; i < 3; i++) {
        await expect(
          upFloorToken.connect(user1).executeExternalCall(
            await upFloorStrategy.getAddress(),
            callValue,
            callData
          )
        ).to.emit(upFloorToken, "RewardPaid")
          .withArgs(user1.address, expectedReward);
      }
    });

    it("Should handle very small call values", async function () {
      const callData = "0x";
      const callValue = ethers.parseEther("0.001"); // 0.001 ETH
      const expectedReward = ethers.parseEther("0.00001"); // 1% of 0.001 ETH

      await expect(
        upFloorToken.connect(user1).executeExternalCall(
          await upFloorStrategy.getAddress(),
          callValue,
          callData
        )
      ).to.emit(upFloorToken, "RewardPaid")
        .withArgs(user1.address, expectedReward);
    });
  });
});
