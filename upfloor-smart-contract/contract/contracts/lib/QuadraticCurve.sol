// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FixedPointMathLib} from "solady/src/utils/FixedPointMathLib.sol";

/// @notice Quadratic bonding curve helpers for mint/redeem style flows.
/// price(s) = p0 + k * s²
library QuadraticCurve {
    using FixedPointMathLib for uint256;
    /// @notice WAD-scaled curve parameters
    struct Params {
        uint128 p0;
        uint128 k;
    }
    /// @notice Reserve required to mint tokenOut
    /// @dev reserveIn = p0 * tokenOut + k * (supply² * tokenOut + supply * tokenOut² + tokenOut³/3)
    /// @dev (round UP)
    function reserveInForTokenOut(Params memory P, uint256 supply, uint256 tokenOut)
        internal
        pure
        returns (uint256 reserveIn)
    {
        // Calculate the area under the curve from supply to (supply + tokenOut)
        // Formula: p0 * tokenOut + k * (supply² * tokenOut + supply * tokenOut² + tokenOut³/3)
        // First term: base price contribution
        uint256 basePrice = tokenOut.mulWadUp(P.p0);
        
        // Cache p0 and k for gas efficiency
        uint256 k = P.k;
        
        // Second term: quadratic contribution
        // We need to calculate: k * (supply² * tokenOut + supply * tokenOut² + tokenOut³/3)
        // Term 1: supply² * tokenOut
        uint256 supplySquared = supply.mulWadUp(supply);
        uint256 term1 = supplySquared.mulWadUp(tokenOut);
        
        // Term 2: supply * tokenOut²
        uint256 tokenOutSquared = tokenOut.mulWadUp(tokenOut);
        uint256 term2 = supply.mulWadUp(tokenOutSquared);
        
        // Term 3: tokenOut³/3
        uint256 tokenOutCubed = tokenOutSquared.mulWadUp(tokenOut); // Reuse tokenOutSquared
        uint256 oneThird = FixedPointMathLib.WAD / 3; // WAD-scaled 1/3
        uint256 term3 = tokenOutCubed.mulWadUp(oneThird);
        
        // Sum the three terms using assembly for gas efficiency
        uint256 quadraticArea;
        assembly {
            quadraticArea := add(add(term1, term2), term3)
        }
        
        // Apply k coefficient
        uint256 quadraticPrice = quadraticArea.mulWadUp(k);
        
        assembly {
            reserveIn := add(basePrice, quadraticPrice)
        }
    }
    /// @notice Reserve received for burning tokenIn
    /// @dev reserveOut = p0 * tokenIn + k * (supply² * tokenIn - supply * tokenIn² + tokenIn³/3)
    /// @dev (round DOWN)
    function reserveOutForTokenIn(Params memory P, uint256 supply, uint256 tokenIn)
        internal
        pure
        returns (uint256 reserveOut)
    {
        // Calculate the area under the curve from (supply - tokenIn) to supply
        // Formula: p0 * tokenIn + k * (supply² * tokenIn - supply * tokenIn² + tokenIn³/3)
        // First term: base price contribution
        uint256 basePrice = tokenIn.mulWad(P.p0);
        
        // Cache k for gas efficiency
        uint256 k = P.k;
        
        // Second term: quadratic contribution
        // We need to calculate: k * (supply² * tokenIn - supply * tokenIn² + tokenIn³/3)
        // Term 1: supply² * tokenIn
        uint256 supplySquared = supply.mulWad(supply);
        uint256 term1 = supplySquared.mulWad(tokenIn);
        
        // Term 2: -supply * tokenIn²
        uint256 tokenInSquared = tokenIn.mulWad(tokenIn);
        uint256 term2 = supply.mulWad(tokenInSquared);
        
        // Term 3: tokenIn³/3
        uint256 tokenInCubed = tokenInSquared.mulWad(tokenIn); // Reuse tokenInSquared
        uint256 oneThird = FixedPointMathLib.WAD / 3; // WAD-scaled 1/3
        uint256 term3 = tokenInCubed.mulWad(oneThird);
        
        // Sum the three terms using assembly (note: term2 is subtracted in the formula)
        uint256 quadraticArea;
        assembly {
            quadraticArea := add(sub(term1, term2), term3)
        }
        
        // Apply k coefficient
        uint256 quadraticPrice = quadraticArea.mulWad(k);
        
        assembly {
            reserveOut := add(basePrice, quadraticPrice)
        }
    }
}