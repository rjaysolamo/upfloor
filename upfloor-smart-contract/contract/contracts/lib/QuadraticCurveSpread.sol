// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FixedPointMathLib} from "solady/src/utils/FixedPointMathLib.sol";
import {QuadraticCurve} from "./QuadraticCurve.sol";

library QuadraticCurveSpread {
    using FixedPointMathLib for uint256;
    using QuadraticCurve for QuadraticCurve.Params;
    /// @notice WAD-scaled curve parameters
    struct Params {
        QuadraticCurve.Params p;
        uint128 buySpread;
        uint128 sellSpread;
    }
    function reserveInForTokenOut(Params memory P, uint256 supply, uint256 tokenOut)
        internal
        pure
        returns (uint256 reserveIn)
    {
        uint256 baseReserveIn = P.p.reserveInForTokenOut(supply, tokenOut);
        uint256 buySpread = P.buySpread;
        
        // Assembly for gas-efficient calculation
        assembly {
            let multiplier := add(1000000000000000000, buySpread) // WAD + buySpread
            reserveIn := div(add(mul(baseReserveIn, multiplier), 999999999999999999), 1000000000000000000) // mulWadUp
        }
    }
    function reserveOutForTokenIn(Params memory P, uint256 supply, uint256 tokenIn)
        internal
        pure
        returns (uint256 reserveOut)
    {
        uint256 baseReserveOut = P.p.reserveOutForTokenIn(supply, tokenIn);
        uint256 sellSpread = P.sellSpread;
        
        // Assembly for gas-efficient calculation
        assembly {
            let multiplier := sub(1000000000000000000, sellSpread) // WAD - sellSpread
            reserveOut := div(mul(baseReserveOut, multiplier), 1000000000000000000) // mulWad
        }
    }
}