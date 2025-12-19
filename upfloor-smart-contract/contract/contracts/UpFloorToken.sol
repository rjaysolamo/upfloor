// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
/*
  _   _ ____  _____ _     ___   ___  ____  
 | | | |  _ \|  ___| |   / _ \ / _ \|  _ \ 
 | | | | |_) | |_  | |  | | | | | | | |_) |
 | |_| |  __/|  _| | |__| |_| | |_| |  _ < 
  \___/|_|   |_|   |_____\___/ \___/|_| \_\

  by DoonLabs
*/

import {ERC20} from "solady/src/tokens/ERC20.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "./Pausable.sol";
import {QuadraticCurve} from "./lib/QuadraticCurve.sol";
import {QuadraticCurveSpread} from "./lib/QuadraticCurveSpread.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4);
}

contract UpFloorToken is ERC20, Ownable, Pausable, ReentrancyGuard, IERC721Receiver, IERC1271 {
    using QuadraticCurve for QuadraticCurve.Params;
    using QuadraticCurveSpread for QuadraticCurveSpread.Params;

    // ------------------ Constants ------------------
    uint256 public constant MAX_SUPPLY = 21_000_000 * 1e18;
    uint128 public constant FEE_RATE = 1e17;
    uint256 public constant PROTOCOL_FEE_BPS = 150; // 1.5%
    uint128 public constant K = 1e14;

    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    bytes4 private constant MAGICVALUE = 0x1626ba7e;

    address public immutable protocolFeeRecipient;
    address public immutable collectionAddress;
    address public immutable factory;
    address public immutable collectionOwnerAddress;
    address public immutable royaltyRecipient;
    
    // Grouped storage for gas efficiency
    address public strategy;
    address public seaportAddress;
    address public taikoMarketplace; // Taiko NFT marketplace (uses ERC-20 payments)
    address public taikoPaymentToken; // ERC-20 token for Taiko marketplace payments
    uint256 public collectionRoyaltyBps; // Default 7% royalty
    
    // Reward mechanism
    uint256 public rewardPercentage = 100; // 1% (100 basis points)
    uint256 public constant REWARD_BASIS_POINTS = 10000; // 100% = 10000 basis points
    
    // Royalty mechanism

    QuadraticCurveSpread.Params public curve;

    string private _name;
    string private _symbol;

    // ------------------ Events ------------------
    event Mint(address indexed by, address indexed to, uint256 assets, uint256 tokens);
    event Redeem(address indexed by, address indexed from, address indexed to, uint256 assets, uint256 tokens);
    event Lock(address indexed by, address indexed from, uint256 tokens);
    event StrategyUpdated(address indexed newStrategy);
    event SurplusUsed(address indexed strategy, uint256 amount);
    event CollectionRoyaltyPaid(address indexed collectionOwner, uint256 amount);
    event SeaportAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event TaikoMarketplaceUpdated(address indexed oldAddress, address indexed newAddress);
    event RewardPaid(address indexed caller, uint256 amount);
    event RewardPercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event CollectionRoyaltyUpdated(uint256 oldRoyaltyBps, uint256 newRoyaltyBps);

    // ------------------ Errors ------------------
    error OnlyStrategy();
    error BadAmount();
    error CapExceeded();
    error InsufficientETH();
    error Slippage();
    error NotAuthorized();
    error SelfCall();
    error InvalidTarget();
    error CallFailed();
    error InvalidAddress();
    error InvalidDestination();
    error InvalidSpender();
    error OnlyNFTs();
    error InsufficientRewardFunds();

    // ------------------ Modifiers ------------------

    modifier onlyStrategy() {
        if (msg.sender != strategy) revert OnlyStrategy();
        _;
    }

    // ------------------ Constructor ------------------
    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        address _feeRecipient,
        address _collection,
        address _collectionOwner,
        address _royaltyRecipient,
        uint256 _royaltyBps
    ) {
        _initializeOwner(msg.sender);

        address feeRecip;
        assembly {
            feeRecip := _feeRecipient
            if iszero(feeRecip) {
                feeRecip := 0x0Dac4637A9b04F64c6b92a19866cd0764adfB6a8
            }
        }
        protocolFeeRecipient = feeRecip;
        collectionAddress = _collection;
        collectionOwnerAddress = _collectionOwner;
        royaltyRecipient = _royaltyRecipient;
        factory = msg.sender;
        
        // Set custom royalty percentage and seaport address
        collectionRoyaltyBps = _royaltyBps;
        seaportAddress = 0x0000000000000068F116a894984e2DB1123eB395;
        
        // Set Taiko marketplace and payment token if on Taiko network (chain ID 167000)
        if (block.chainid == 167000) {
            taikoMarketplace = 0x89aFa165F40f2210c99e87E706C0160503E12F1c;
            taikoPaymentToken = 0xA9d23408b9bA935c230493c40C73824Df71A0975;
        }

        _name = tokenName;
        _symbol = tokenSymbol;

        curve = QuadraticCurveSpread.Params({
            p: QuadraticCurve.Params({p0: 0, k: K}),
            buySpread: FEE_RATE,
            sellSpread: FEE_RATE
        });
    }

    // ------------------ ERC20 Overrides ------------------
    function name() public view override returns (string memory) { return _name; }
    function symbol() public view override returns (string memory) { return _symbol; }

    // ------------------ Getter Functions ------------------
    function getProtocolFeeRecipient() external view returns (address) { return protocolFeeRecipient; }
    function getCollectionAddress() external view returns (address) { return collectionAddress; }
    function getCollectionOwnerAddress() external view returns (address) { return collectionOwnerAddress; }
    function getRoyaltyRecipient() external view returns (address) { return royaltyRecipient; }
    function getFactory() external view returns (address) { return factory; }
    function getRewardPercentage() external view returns (uint256) { return rewardPercentage; }
    function getCollectionRoyaltyBps() external view returns (uint256) { return collectionRoyaltyBps; }

    // ------------------ Preview Functions ------------------
    function previewMint(uint256 amount) external view returns (uint256) {
        return curve.reserveInForTokenOut(totalSupply(), amount);
    }

    function previewRedeem(uint256 amount) external view returns (uint256) {
        return curve.reserveOutForTokenIn(totalSupply(), amount);
    }

    // ------------------ Supply View Functions ------------------
    function lockedSupply() public view returns (uint256 locked) {
        // Direct balance access is already optimized in ERC20
        return balanceOf(DEAD_ADDRESS);
    }

    function effectiveSupply() public view returns (uint256 effective) {
        // Single call to avoid double SLOAD
        uint256 total = totalSupply();
        uint256 locked = balanceOf(DEAD_ADDRESS);
        assembly {
            effective := sub(total, locked)
        }
    }

    // ------------------ Mint / Redeem ------------------
    function mint(uint256 amount, address receiver) external payable whenNotPaused nonReentrant {

        assembly {
            if iszero(amount) {
                mstore(0x00, 0x2c5211c6) // BadAmount()
                revert(0x1c, 0x04)
            }
        }
        
        uint256 supply = totalSupply();
        unchecked {
            if (supply + amount > MAX_SUPPLY) revert CapExceeded();
        }

        uint256 price = curve.reserveInForTokenOut(supply, amount);
        

        assembly {
            if lt(callvalue(), price) {
                mstore(0x00, 0x356680b7) // InsufficientETH()
                revert(0x1c, 0x04)
            }
        }

        uint256 protocolFee = _calcProtocolFee(price);
        
        // Calculate royalty tokens before minting
        uint256 royaltyTokens;
        address royaltyRec = royaltyRecipient;
        if (royaltyRec != address(0) && collectionRoyaltyBps > 0) {
            royaltyTokens = (amount * collectionRoyaltyBps) / 10000;
        }
        
        // Mint tokens to receiver and royalty recipient
        _mint(receiver, amount);
        if (royaltyTokens > 0) {
            _mint(royaltyRec, royaltyTokens);
            emit CollectionRoyaltyPaid(royaltyRec, royaltyTokens);
        }

        SafeTransferLib.safeTransferETH(protocolFeeRecipient, protocolFee);

        // Optimized refund logic
        uint256 msgValue = msg.value;
        if (msgValue > price) {
            unchecked {
                SafeTransferLib.safeTransferETH(msg.sender, msgValue - price);
            }
        }

        emit Mint(msg.sender, receiver, price, amount);
    }

    /// @dev Mint tokens using TAIKO tokens (ERC-20) instead of ETH
    /// @param amount The amount of tokens to mint
    /// @param receiver The address to receive the minted tokens
    /// @notice Payment is made in TAIKO tokens, gas is still paid in ETH
    function mintWithTaiko(uint256 amount, address receiver) external whenNotPaused nonReentrant {
        assembly {
            if iszero(amount) {
                mstore(0x00, 0x2c5211c6) // BadAmount()
                revert(0x1c, 0x04)
            }
        }
        
        // Check if Taiko payment token is set
        address paymentToken = taikoPaymentToken;
        assembly {
            if iszero(paymentToken) {
                mstore(0x00, 0xe6c4247b) // InvalidAddress()
                revert(0x1c, 0x04)
            }
        }
        
        uint256 supply = totalSupply();
        unchecked {
            if (supply + amount > MAX_SUPPLY) revert CapExceeded();
        }

        uint256 price = curve.reserveInForTokenOut(supply, amount);
        uint256 protocolFee = _calcProtocolFee(price);
        
        // Calculate royalty tokens before minting
        uint256 royaltyTokens;
        address royaltyRec = royaltyRecipient;
        if (royaltyRec != address(0) && collectionRoyaltyBps > 0) {
            royaltyTokens = (amount * collectionRoyaltyBps) / 10000;
        }
        
        // Transfer TAIKO tokens from user to this contract
        IERC20 taiko = IERC20(paymentToken);
        bool success = taiko.transferFrom(msg.sender, address(this), price);
        assembly {
            if iszero(success) {
                mstore(0x00, 0xb1dc8ae3) // CallFailed()
                revert(0x1c, 0x04)
            }
        }
        
        // Transfer protocol fee in TAIKO to protocol fee recipient
        success = taiko.transfer(protocolFeeRecipient, protocolFee);
        assembly {
            if iszero(success) {
                mstore(0x00, 0xb1dc8ae3) // CallFailed()
                revert(0x1c, 0x04)
            }
        }
        
        // Mint tokens to receiver and royalty recipient
        _mint(receiver, amount);
        if (royaltyTokens > 0) {
            _mint(royaltyRec, royaltyTokens);
            emit CollectionRoyaltyPaid(royaltyRec, royaltyTokens);
        }

        emit Mint(msg.sender, receiver, price, amount);
    }

    function redeem(uint256 amount, address from, address to, uint256 minOut)
        external
        whenNotPaused
        nonReentrant
    {
        // Assembly zero check
        assembly {
            if iszero(amount) {
                mstore(0x00, 0x2c5211c6) // BadAmount()
                revert(0x1c, 0x04)
            }
        }
        
        uint256 supply = totalSupply();
        uint256 price = curve.reserveOutForTokenIn(supply, amount);
        

        assembly {
            if lt(price, minOut) {
                mstore(0x00, 0x84433609) // Slippage()
                revert(0x1c, 0x04)
            }
        }

        if (msg.sender != from) _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        SafeTransferLib.safeTransferETH(to, price);
        emit Redeem(msg.sender, from, to, price, amount);
    }

    /// @dev Redeem tokens for TAIKO tokens (ERC-20) instead of ETH
    /// @param amount The amount of tokens to redeem
    /// @param from The address to burn tokens from
    /// @param to The address to receive the TAIKO tokens
    /// @param minOut Minimum TAIKO tokens to receive (slippage protection)
    /// @notice Burns BRIGADE tokens and returns TAIKO tokens
    function redeemWithTaiko(uint256 amount, address from, address to, uint256 minOut)
        external
        whenNotPaused
        nonReentrant
    {
        // Assembly zero check
        assembly {
            if iszero(amount) {
                mstore(0x00, 0x2c5211c6) // BadAmount()
                revert(0x1c, 0x04)
            }
        }
        
        // Check if Taiko payment token is set
        address paymentToken = taikoPaymentToken;
        assembly {
            if iszero(paymentToken) {
                mstore(0x00, 0xe6c4247b) // InvalidAddress()
                revert(0x1c, 0x04)
            }
        }
        
        uint256 supply = totalSupply();
        uint256 price = curve.reserveOutForTokenIn(supply, amount);
        
        assembly {
            if lt(price, minOut) {
                mstore(0x00, 0x84433609) // Slippage()
                revert(0x1c, 0x04)
            }
        }

        // Check if contract has enough TAIKO tokens
        IERC20 taiko = IERC20(paymentToken);
        uint256 contractTaikoBalance = taiko.balanceOf(address(this));
        assembly {
            if lt(contractTaikoBalance, price) {
                mstore(0x00, 0x356680b7) // InsufficientETH() - reusing for insufficient tokens
                revert(0x1c, 0x04)
            }
        }

        if (msg.sender != from) _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        
        // Transfer TAIKO tokens to recipient
        bool success = taiko.transfer(to, price);
        assembly {
            if iszero(success) {
                mstore(0x00, 0xb1dc8ae3) // CallFailed()
                revert(0x1c, 0x04)
            }
        }
        
        emit Redeem(msg.sender, from, to, price, amount);
    }

    function lock(uint256 amount, address from) external nonReentrant {

        assembly {
            if iszero(amount) {
                mstore(0x00, 0x2c5211c6) // BadAmount()
                revert(0x1c, 0x04)
            }
        }
        
        if (msg.sender != from) _spendAllowance(from, msg.sender, amount);
        _transfer(from, DEAD_ADDRESS, amount);
        emit Lock(msg.sender, from, amount);
    }

    // ------------------ Internal Fee Logic ------------------
    function _calcProtocolFee(uint256 mintPrice) 
        internal 
        pure 
        returns (uint256 protocolFee) 
    {
        // Protocol fee: 1.5% of total transaction value (in native currency)
        assembly {
            protocolFee := div(mul(mintPrice, 150), 10000) // 1.5% of mint price
        }
    }

    // ------------------ Surplus & Strategy ------------------
    function surplus() public view returns (uint256 surplusAmount) {
        uint256 supply = totalSupply();
        

        assembly {
            if iszero(supply) {
                return(0, 32)
            }
        }
        
        uint256 bal = address(this).balance;
        uint256 lockedTokens = balanceOf(DEAD_ADDRESS);
        uint256 eff;
        
        assembly {
            eff := sub(supply, lockedTokens)
        }
        
        uint256 res = curve.reserveOutForTokenIn(supply, eff);
        uint256 base = curve.p.reserveOutForTokenIn(supply, eff);
        
        // Early return if no surplus possible
        assembly {
            if iszero(gt(base, res)) {
                return(0, 32)
            }
        }
        
        uint256 deferred;
        assembly {
            let diff := sub(base, res)
            deferred := div(mul(diff, 9850), 10000) // 10_000 - PROTOCOL_FEE_BPS (150)
            
            let threshold := add(res, deferred)
            if iszero(gt(bal, threshold)) {
                return(0, 32)
            }
            
            surplusAmount := sub(bal, threshold)
        }
    }

    function useSurplus(uint256 amt) external onlyStrategy nonReentrant {
        uint256 availableSurplus = surplus();
        

        assembly {
            if gt(amt, availableSurplus) {
                mstore(0x00, 0x356680b7) // InsufficientETH()
                revert(0x1c, 0x04)
            }
        }
        
        SafeTransferLib.safeTransferETH(strategy, amt);
        emit SurplusUsed(strategy, amt);
    }

    function setStrategy(address newStrategy) external onlyOwner {
        strategy = newStrategy;
        emit StrategyUpdated(newStrategy);
    }


    function setRewardPercentage(uint256 newRewardPercentage) external onlyOwner {
        uint256 oldPercentage = rewardPercentage;
        rewardPercentage = newRewardPercentage;
        emit RewardPercentageUpdated(oldPercentage, newRewardPercentage);
    }
    
    function setCollectionRoyaltyBps(uint256 newRoyaltyBps) external onlyOwner {
        uint256 oldRoyaltyBps = collectionRoyaltyBps;
        collectionRoyaltyBps = newRoyaltyBps;
        emit CollectionRoyaltyUpdated(oldRoyaltyBps, newRoyaltyBps);
    }

    // ------------------ Admin Controls ------------------
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    function setSeaportAddress(address newSeaportAddress) external onlyOwner {

        assembly {
            if iszero(newSeaportAddress) {
                mstore(0x00, 0xe6c4247b) // InvalidAddress()
                revert(0x1c, 0x04)
            }
        }
        
        address oldAddress = seaportAddress;
        seaportAddress = newSeaportAddress;
        emit SeaportAddressUpdated(oldAddress, newSeaportAddress);
    }
    
    function setTaikoMarketplace(address newTaikoMarketplace) external onlyOwner {

        assembly {
            if iszero(newTaikoMarketplace) {
                mstore(0x00, 0xe6c4247b) // InvalidAddress()
                revert(0x1c, 0x04)
            }
        }
        
        address oldAddress = taikoMarketplace;
        taikoMarketplace = newTaikoMarketplace;
        emit TaikoMarketplaceUpdated(oldAddress, newTaikoMarketplace);
    }
    
    function setTaikoPaymentToken(address newPaymentToken) external onlyOwner {

        assembly {
            if iszero(newPaymentToken) {
                mstore(0x00, 0xe6c4247b) // InvalidAddress()
                revert(0x1c, 0x04)
            }
        }
        
        taikoPaymentToken = newPaymentToken;
    }



    // ------------------ Owner Functions ------------------
 
    function approveTokens(address spender, uint256 amount) external onlyOwner {
        // Owner can only approve tokens for strategy, Seaport, Taiko marketplace, or Taiko payment token
        if (spender != strategy && spender != seaportAddress && spender != taikoMarketplace && spender != taikoPaymentToken) revert InvalidSpender();
        _approve(address(this), spender, amount);
    }

    // ------------------ External / Admin ------------------
    function executeExternalCall(address target, uint256 value, bytes calldata data)
        external
        nonReentrant
        returns (bytes memory)
    {
        // more gas efficient
        address cachedSeaport = seaportAddress;
        address cachedStrategy = strategy;
        address cachedCollection = collectionAddress;
        address cachedTaikoMarketplace = taikoMarketplace;
        address cachedTaikoPaymentToken = taikoPaymentToken;
        
        assembly {
            // Check if target is this contract
            if eq(target, address()) {
                mstore(0x00, 0x73096ddb) // SelfCall()
                revert(0x1c, 0x04)
            }
            
            // Check if target is one of allowed addresses
            let isValid := or(
                or(
                    or(
                        or(eq(target, cachedSeaport), eq(target, cachedStrategy)),
                        eq(target, cachedCollection)
                    ),
                    eq(target, cachedTaikoMarketplace)
                ),
                eq(target, cachedTaikoPaymentToken)
            )
            
            if iszero(isValid) {
                mstore(0x00, 0x99044620) // InvalidTarget()
                revert(0x1c, 0x04)
            }
        }

        // Execute the external call 
        (bool ok, bytes memory res) = target.call{value: value}(data);
        
        assembly {
            if iszero(ok) {
                mstore(0x00, 0xb1dc8ae3) // CallFailed()
                revert(0x1c, 0x04)
            }
        }
        
        // Only pay rewards if the external call was successful AND meaningful
        if (value > 0) {
            uint256 rp = rewardPercentage;
            address o = owner();
            
            // Check if should pay reward
            bool shouldPayReward;
            assembly {
                shouldPayReward := and(
                    and(iszero(iszero(rp)), iszero(eq(caller(), o))),
                    gt(value, 0)
                )
            }
            
            if (shouldPayReward && _isMeaningfulAction(target, data, res)) {
                uint256 reward;
                assembly {
                    reward := div(mul(value, rp), 10000) // REWARD_BASIS_POINTS
                }
                
                if (balanceOf(address(this)) >= reward) {
                    _transfer(address(this), msg.sender, reward);
                    emit RewardPaid(msg.sender, reward);
                }
            }
        }

        return res;
    }

    /// @dev Check if the external call was a meaningful action that deserves a reward
    /// @param target The target contract address
    /// @param data The call data
    /// @param result The call result
    /// @return isMeaningful True if the action was meaningful
    function _isMeaningfulAction(address target, bytes calldata data, bytes memory result) 
        internal 
        view 
        returns (bool isMeaningful) 
    {
        // If no data, it's likely a receive() call - not meaningful
        if (data.length == 0) {
            return false;
        }
        
        // Cache storage reads
        address sp = seaportAddress;
        address st = strategy;
        address col = collectionAddress;
        address tm = taikoMarketplace;
        address tpt = taikoPaymentToken;
        
        // For Seaport calls, check if it was a successful order fulfillment
        if (target == sp) {
            return _isSuccessfulSeaportCall(data, result);
        }
        
        // For Strategy calls, check if it was a meaningful function call
        if (target == st) {
            return _isSuccessfulStrategyCall(data, result);
        }
        
        // For Collection calls, check if it was a successful NFT transfer
        if (target == col) {
            return _isSuccessfulCollectionCall(data, result);
        }
        
        // For Taiko Marketplace calls, check if it was a meaningful action
        if (target == tm) {
            return _isSuccessfulTaikoMarketplaceCall(data, result);
        }
        
        // For Taiko Payment Token calls (ERC-20 approve), check if meaningful
        if (target == tpt) {
            return _isSuccessfulERC20Call(data, result);
        }
        
        return false;
    }
    
    /// @dev Check if Seaport call was successful and meaningful
    function _isSuccessfulSeaportCall(bytes calldata data, bytes memory result) 
        internal 
        pure 
        returns (bool) 
    {
        // Check if result indicates success (non-empty and not error)
        if (result.length == 0) {
            return false;
        }
        
        // Early return if no function selector
        if (data.length < 4) {
            return false;
        }
        
        // Extract function selector once
        bytes4 selector = bytes4(data[0:4]);
        
        // Common Seaport fulfillment functions - use assembly for gas efficiency
        assembly {
            // Check if selector matches any of the known fulfillment functions
            // This is more gas efficient than multiple OR conditions
            let isKnownSelector := or(
                or(
                    or(eq(selector, 0x1a4449db), eq(selector, 0x644add63)), // fulfillBasicOrder_efficient_6GL6yc, fulfillOrder
                    or(eq(selector, 0x5f61b11a), eq(selector, 0xa1451a06))  // fulfillAdvancedOrder, fulfillAvailableOrders
                ),
                eq(selector, 0x8a11ddf6) // fulfillAvailableAdvancedOrders
            )
            
            if isKnownSelector {
                return(0, 32)
            }
        }
        
        // Only allow specific known Seaport functions - no permissive fallback
        return false;
    }
    
    /// @dev Check if Strategy call was successful and meaningful
    function _isSuccessfulStrategyCall(bytes calldata data, bytes memory result) 
        internal 
        pure 
        returns (bool) 
    {
        // Early returns for invalid cases
        if (data.length == 0 || result.length == 0 || data.length < 4) {
            return false;
        }
        
        // Extract function selector once
        bytes4 selector = bytes4(data[0:4]);
        
        // Use assembly for gas-efficient selector checking
        assembly {
            // Check if selector matches any of the known meaningful functions
            let isMeaningfulSelector := or(
                or(eq(selector, 0x2b1fd58a), eq(selector, 0x4ab15871)), // acceptBid, proposeAuction
                eq(selector, 0x91e078bb) // startAuction
            )
            
            if isMeaningfulSelector {
                return(0, 32)
            }
        }
        
        return false;
    }
    
    /// @dev Check if Collection call was successful and meaningful
    function _isSuccessfulCollectionCall(bytes calldata data, bytes memory result) 
        internal 
        pure 
        returns (bool) 
    {
        // Early returns for invalid cases
        if (data.length == 0 || result.length == 0 || data.length < 4) {
            return false;
        }
        
        // Extract function selector once
        bytes4 selector = bytes4(data[0:4]);
        
        // Use assembly for gas-efficient selector checking
        assembly {
            // Check if selector matches safeTransferFrom (0x42842e0e)
            if eq(selector, 0x42842e0e) {
                return(0, 32)
            }
        }
        
        return false;
    }
    
    /// @dev Check if Taiko Marketplace call was successful and meaningful
    function _isSuccessfulTaikoMarketplaceCall(bytes calldata data, bytes memory result) 
        internal 
        pure 
        returns (bool) 
    {
        // Early returns for invalid cases
        if (data.length == 0 || result.length == 0 || data.length < 4) {
            return false;
        }
        
        // Extract function selector once
        bytes4 selector = bytes4(data[0:4]);
        
        // Use assembly for gas-efficient selector checking
        assembly {
            // Check if selector matches known Taiko marketplace functions
            // listNFT (0x8b7afe2e), buyNFT (0x8d6cc56d), buyNFT (0x51ed8288), cancelListing (0x514fcac7)
            let isMeaningfulSelector := or(
                or(
                    or(eq(selector, 0x8b7afe2e), eq(selector, 0x8d6cc56d)), // listNFT, buyNFT
                    eq(selector, 0x51ed8288) // buyNFT (alternative)
                ),
                eq(selector, 0x514fcac7) // cancelListing
            )
            
            if isMeaningfulSelector {
                return(0, 32)
            }
        }
        
        return false;
    }
    
    /// @dev Check if ERC-20 call was successful and meaningful (for Taiko payment token)
    function _isSuccessfulERC20Call(bytes calldata data, bytes memory result) 
        internal 
        pure 
        returns (bool) 
    {
        // Early returns for invalid cases
        if (data.length == 0 || result.length == 0 || data.length < 4) {
            return false;
        }
        
        // Extract function selector once
        bytes4 selector = bytes4(data[0:4]);
        
        // Use assembly for gas-efficient selector checking
        assembly {
            // Check if selector matches approve (0x095ea7b3)
            if eq(selector, 0x095ea7b3) {
                return(0, 32)
            }
        }
        
        return false;
    }

    // ------------------ Signature Validation ------------------
    function isValidSignature(bytes32 hash, bytes memory sig) external view override returns (bytes4) {
        if (sig.length != 65) return bytes4(0xffffffff);
        
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        
        // Handle both 0/1 and 27/28 v values
        if (v < 27) {
            v += 27;
        }
        
        // Validate v value
        if (v != 27 && v != 28) return bytes4(0xffffffff);
        
        // Validate s value to prevent signature malleability
        if (s > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return bytes4(0xffffffff);
        }
        
        // Create Ethereum signed message hash
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Signed Message:\n32", hash));
        
        // Recover signer and validate
        address signer = ecrecover(ethHash, v, r, s);
        if (signer == address(0)) return bytes4(0xffffffff);
        
        return signer == owner() ? MAGICVALUE : bytes4(0xffffffff);
    }

    // ------------------ ERC721 Receiver ------------------
    /// @dev Handle the receipt of an NFT
    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {}
    
    fallback() external payable { revert(); }
}

