import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { getChainConfig, getRpcUrl } from "@/lib/chainlist";

// Token ABI for price calculation ssr 
// currently not used we use the client rpc to fetch the price
const TOKEN_ABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "result", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "curve",
    outputs: [
      {
        components: [
          { internalType: "uint128", name: "p0", type: "uint128" },
          { internalType: "uint128", name: "k", type: "uint128" },
        ],
        internalType: "struct QuadraticCurve.Params",
        name: "p",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "previewMint",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('tokenAddress');
    const chainId = parseInt(searchParams.get('chainId') || '1');
    const amount = searchParams.get('amount') || '1';

    if (!tokenAddress) {
      return NextResponse.json(
        { error: "Token address is required" },
        { status: 400 }
      );
    }

    // Get chain configuration
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    // Get RPC URL for the specific chain
    const rpcUrl = getRpcUrl(chainId);
    if (!rpcUrl) {
      return NextResponse.json(
        { error: `No RPC URL configured for chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    // Create public client for the specific chain
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    try {
      // Fetch token data
      const [totalSupplyRaw, tokenSymbol, curveData] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'totalSupply',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'curve',
        }).catch(() => null), // Fallback if curve doesn't exist
      ]);

      const currentSupply = Number(totalSupplyRaw) / 1e18;
      let K = 0.0001; // Default fallback
      
      if (curveData) {
        K = Number(curveData.k) / 1e18;
      }

      const FEE_RATE = 0.1; // 10% fee

      // Calculate price for the requested amount
      const tokenAmount = parseFloat(amount);
      const priceForTokens = getPriceForTokens(tokenAmount, currentSupply, K, FEE_RATE);
      const pricePerToken = tokenAmount > 0 ? priceForTokens / tokenAmount : 0;

      // Calculate tokens for 1 unit of native currency
      const tokensForOne = getTokensForETH(1, currentSupply, K, FEE_RATE);

      return NextResponse.json({
        success: true,
        data: {
          tokenAddress,
          tokenSymbol,
          chainId,
          currency: chainConfig.currency,
          currentSupply: currentSupply.toFixed(4),
          curveK: K,
          feeRate: FEE_RATE * 100,
          priceForTokens: priceForTokens.toFixed(8),
          pricePerToken: pricePerToken.toFixed(8),
          tokensForOne: tokensForOne.toFixed(4),
          networkName: chainConfig.networkName,
        }
      });

    } catch (contractError) {
      console.error('Contract read error:', contractError);
      return NextResponse.json(
        { error: "Failed to read token contract data" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Token price API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Bonding curve price calculation functions
function getPriceForTokens(tokens: number, currentSupply: number, K: number, feeRate: number): number {
  const s = currentSupply;
  return K * (s * s * tokens + s * tokens * tokens + tokens * tokens * tokens / 3) * (1 + feeRate);
}

function getTokensForETH(ethAmount: number, currentSupply: number, K: number, feeRate: number): number {
  let low = 0;
  let high = 1_000_000;
  let best = 0;
  
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const cost = getPriceForTokens(mid, currentSupply, K, feeRate);
    
    if (cost <= ethAmount) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
    
    if (Math.abs(high - low) < 1e-9) break;
  }
  
  return best;
}
