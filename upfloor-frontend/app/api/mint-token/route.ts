import { NextRequest, NextResponse } from "next/server";
import { getChainConfig, getRpcUrl } from "@/lib/chainlist";

// Router ABI for minting
const ROUTER_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

// Token ABI for preview
const TOKEN_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "previewMint",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tokenAddress, 
      routerAddress, 
      chainId, 
      amount, 
      receiverAddress
    } = body;

    if (!tokenAddress || !routerAddress || !chainId || !amount || !receiverAddress) {
      return NextResponse.json(
        { error: "Missing required fields: tokenAddress, routerAddress, chainId, amount, receiverAddress" },
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

    // Return transaction data for frontend to execute
    return NextResponse.json({
      success: true,
      data: {
        tokenAddress,
        routerAddress,
        chainId,
        amount: amount.toString(),
        currency: chainConfig.currency,
        receiverAddress,
        rpcUrl,
        networkName: chainConfig.networkName,
        message: "Transaction data prepared for wallet execution"
      }
    });

  } catch (error) {
    console.error("Mint token API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
