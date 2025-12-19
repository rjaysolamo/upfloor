import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { getChainConfig, getRpcUrl } from "@/lib/chainlist";
import { Pool } from "pg";

// ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');
    const chainId = parseInt(searchParams.get('chainId') || '1');

    if (!userAddress) {
      return NextResponse.json(
        { error: "User address is required" },
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

    // Fetch tokens from database for this chain
    const tokensQuery = `
      SELECT 
        token_address,
        token_symbol,
        collection_name,
        collection_image,
        chain_id
      FROM collections 
      WHERE chain_id = $1
      ORDER BY created_at DESC
    `;

    const tokensResult = await pool.query(tokensQuery, [chainId]);
    const tokens = tokensResult.rows;

    console.log(`Found ${tokens.length} tokens in database for chain ${chainId}`);

    // Check user's balance for each token
    const userTokens = [];
    
    for (const token of tokens) {
      try {
        // Get user's balance for this token
        const balance = await publicClient.readContract({
          address: token.token_address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`]
        });

        const balanceNumber = Number(balance) / 1e18; // Convert from wei

        // Only include tokens with non-zero balance
        if (balanceNumber > 0) {
          // Get token symbol and name from contract
          const [symbol, name] = await Promise.all([
            publicClient.readContract({
              address: token.token_address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'symbol'
            }).catch(() => token.token_symbol), // Fallback to database symbol
            publicClient.readContract({
              address: token.token_address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'name'
            }).catch(() => token.collection_name) // Fallback to database name
          ]);

          userTokens.push({
            address: token.token_address,
            symbol: symbol,
            name: name,
            balance: balanceNumber,
            imageUrl: token.collection_image ? `data:image/png;base64,${Buffer.from(token.collection_image).toString('base64')}` : null,
            chainId: token.chain_id,
            networkName: chainConfig.networkName,
            currency: chainConfig.currency
          });

          console.log(`User owns ${balanceNumber} ${symbol} tokens`);
        }
      } catch (error) {
        console.error(`Error checking balance for token ${token.token_address}:`, error);
        // Continue with other tokens even if one fails
      }
    }

    console.log(`User owns ${userTokens.length} different tokens`);

    return NextResponse.json({
      success: true,
      data: {
        userAddress,
        chainId,
        networkName: chainConfig.networkName,
        currency: chainConfig.currency,
        tokens: userTokens,
        totalTokens: userTokens.length
      }
    });

  } catch (error) {
    console.error("User tokens API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
