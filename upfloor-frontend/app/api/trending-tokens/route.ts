import { NextRequest, NextResponse } from "next/server";
import { Pool } from 'pg';
import { getChainConfig } from "@/lib/chainlist";
import { createPublicClient, http } from "viem";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Contract ABIs (same as TradingHub)
const TOKEN_ABI = [
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "result", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "curve",
    "outputs": [
      {
        "components": [
          {"internalType": "uint128", "name": "p0", "type": "uint128"},
          {"internalType": "uint128", "name": "k", "type": "uint128"}
        ],
        "internalType": "struct QuadraticCurve.Params",
        "name": "p",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Bonding curve price calculation functions (same as TradingHub)
function getPriceForTokens(tokens: number, currentSupply: number, K: number, feeRate: number): number {
  const s = currentSupply
  return K * (s * s * tokens + s * tokens * tokens + tokens * tokens * tokens / 3) * (1 + feeRate)
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

// Function to fetch real token data from blockchain
async function fetchTokenData(tokenAddress: string, chainId: number) {
  try {
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) return null;

    const publicClient = createPublicClient({
      chain: chainConfig.viemChain,
      transport: http(chainConfig.rpcUrl)
    });

    // Get token contract data
    const [totalSupply, symbol, curve, contractBalance] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'totalSupply'
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'symbol'
      }).catch(() => 'UNKNOWN'),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'curve'
      }).catch(() => null),
      publicClient.getBalance({
        address: tokenAddress as `0x${string}`
      }).catch(() => BigInt(0))
    ]);

    // Calculate bonding curve price
    const currentSupply = Number(totalSupply) / 1e18;
    let K = 0.0001; // Default fallback
    
    if (curve) {
      K = Number(curve.k) / 1e18;
    }

    const FEE_RATE = 0.1; // 10% fee

    // Get native currency price
    const nativeCurrencyPrice = chainConfig.currency === 'MON' ? 3.8496 : 1; // Mock for other currencies

    // Calculate price for 1 token
    const tokenAmount = 1;
    const priceForTokens = getPriceForTokens(tokenAmount, currentSupply, K, FEE_RATE);
    const pricePerToken = tokenAmount > 0 ? priceForTokens / tokenAmount : 0;
    const tokensForOne = getTokensForETH(1, currentSupply, K, FEE_RATE);

    // Calculate market cap and FDV
    const marketCapUSD = currentSupply * pricePerToken * nativeCurrencyPrice;
    const fdvUSD = currentSupply * pricePerToken * nativeCurrencyPrice; // Same as market cap for bonding curve tokens
    const liquidityUSD = Number(contractBalance) / 1e18 * nativeCurrencyPrice;

    return {
      currentSupply,
      pricePerToken,
      nativeCurrencyPrice,
      marketCapUSD,
      fdvUSD,
      liquidityUSD,
      contractBalance: Number(contractBalance) / 1e18,
      curveK: K,
      feeRate: FEE_RATE * 100,
      symbol: symbol as string
    };
  } catch (error) {
    console.error(`Error fetching token data for ${tokenAddress}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = `
      SELECT 
        c.id,
        c.token_address,
        c.token_symbol,
        c.collection_name,
        c.router_address,
        c.chain_id,
        c.collection_image,
        c.total_supply,
        c.listed_count,
        c.floor_price,
        c.market_cap,
        c.opensea_data_updated_at,
        c.created_at,
        c.updated_at,
        CASE c.chain_id
          WHEN 1 THEN 'Ethereum Mainnet'
          WHEN 11155111 THEN 'Ethereum Sepolia Testnet'
          WHEN 137 THEN 'Polygon Mainnet'
          WHEN 10 THEN 'Optimism Mainnet'
          WHEN 42161 THEN 'Arbitrum One'
          WHEN 8453 THEN 'Base Mainnet'
          WHEN 10143 THEN 'Monad Testnet'
          WHEN 33139 THEN 'Apechain Mainnet'
          WHEN 167000 THEN 'Taiko Alethia'
          ELSE 'Unknown Network'
        END as network_name
      FROM collections c
      WHERE c.token_address IS NOT NULL 
        AND c.token_symbol IS NOT NULL
        AND c.router_address IS NOT NULL
    `;

    const params: any[] = [];
    
    if (chainId) {
      query += ` AND c.chain_id = $1`;
      params.push(parseInt(chainId));
    }

    // Order by most recent activity (updated_at) and limit results
    query += ` ORDER BY c.updated_at DESC, c.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      
      // Transform the data to include real blockchain metrics
      const trendingTokens = (await Promise.all(result.rows.map(async (row) => {
        const chainConfig = getChainConfig(row.chain_id);
        
        // Debug: Log chain config for Taiko tokens
        if (row.chain_id === 167000) {
          console.log(`🔍 Taiko token debug:`, {
            chainId: row.chain_id,
            tokenSymbol: row.token_symbol,
            chainConfig: chainConfig,
            currency: chainConfig?.currency
          });
        }
        
        // Skip tokens without essential data
        if (!row.collection_name || !row.token_symbol || !row.token_address) {
          return null;
        }

        // Fetch real token data from blockchain
        const tokenData = await fetchTokenData(row.token_address, row.chain_id);
        
        // Convert BYTEA to base64 data URL if image exists
        let imageUrl = null;
        if (row.collection_image) {
          const base64 = Buffer.from(row.collection_image).toString('base64');
          imageUrl = `data:image/png;base64,${base64}`;
        }

        // Use real data if available, otherwise fallback to database data
        const currentSupply = tokenData?.currentSupply || (row.total_supply ? Number(row.total_supply) : 0);
        const pricePerToken = tokenData?.pricePerToken || (row.floor_price ? Number(row.floor_price) : 0);
        const nativeCurrencyPrice = tokenData?.nativeCurrencyPrice || (chainConfig?.currency === 'MON' ? 3.8496 : 1);
        const marketCapUSD = tokenData?.marketCapUSD || (currentSupply * pricePerToken * nativeCurrencyPrice);
        const fdvUSD = tokenData?.fdvUSD || marketCapUSD;
        const liquidityUSD = tokenData?.liquidityUSD || 0;
        const contractBalance = tokenData?.contractBalance || 0;
        const curveK = tokenData?.curveK || 0;
        const feeRate = tokenData?.feeRate || 0;

        // Format market cap and FDV
        const marketCapFormatted = marketCapUSD > 1000000 
          ? `$${(marketCapUSD / 1000000).toFixed(2)}M`
          : marketCapUSD > 1000 
          ? `$${(marketCapUSD / 1000).toFixed(2)}K`
          : `$${marketCapUSD.toFixed(2)}`;

        const fdvFormatted = fdvUSD > 1000000 
          ? `$${(fdvUSD / 1000000).toFixed(2)}M`
          : fdvUSD > 1000 
          ? `$${(fdvUSD / 1000).toFixed(2)}K`
          : `$${fdvUSD.toFixed(2)}`;

        const liquidityFormatted = liquidityUSD > 1000000 
          ? `$${(liquidityUSD / 1000000).toFixed(2)}M`
          : liquidityUSD > 1000 
          ? `$${(liquidityUSD / 1000).toFixed(2)}K`
          : `$${liquidityUSD.toFixed(2)}`;

        // Calculate progress based on time since creation
        const daysSinceCreation = (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const progress = Math.min(100, (daysSinceCreation / 7) * 100); // 7 days to reach 100%

        // Mock data for fields we don't have real data for yet
        const mockChanges = {
          change1h: (Math.random() - 0.5) * 10, // -5% to +5%
          change4h: (Math.random() - 0.5) * 20, // -10% to +10%
          change12h: (Math.random() - 0.5) * 30, // -15% to +15%
          change24h: (Math.random() - 0.5) * 40, // -20% to +20%
        };

        const mockVolume = Math.random() * 1000000; // 0 to 1M
        const volumeFormatted = mockVolume > 1000000 
          ? `$${(mockVolume / 1000000).toFixed(2)}M`
          : mockVolume > 1000 
          ? `$${(mockVolume / 1000).toFixed(2)}K`
          : `$${mockVolume.toFixed(2)}`;

        const burnedPercentage = Math.random() * 5; // 0-5% burned
        const burnedAmount = currentSupply * burnedPercentage / 100;
        const holdings = Math.floor(Math.random() * 100) + 10; // 10-110 holders

        // Debug: Log price formatting for Taiko tokens
        const currencySymbol = chainConfig?.currency || 'ETH';
        const formattedPrice = pricePerToken > 0 ? `${pricePerToken.toFixed(6)} ${currencySymbol}` : 'N/A';
        
        if (row.chain_id === 167000) {
          console.log(`💰 Taiko price formatting:`, {
            pricePerToken,
            currencySymbol,
            formattedPrice,
            chainConfig: chainConfig
          });
        }

        return {
          id: row.id,
          name: row.collection_name,
          symbol: row.token_symbol,
          icon: imageUrl || "/placeholder-logo.png",
          price: formattedPrice,
          change1h: mockChanges.change1h,
          change4h: mockChanges.change4h,
          change12h: mockChanges.change12h,
          change24h: mockChanges.change24h,
          volume24h: volumeFormatted,
          marketCap: marketCapFormatted,
          fdv: fdvFormatted,
          liquidity: liquidityFormatted,
          holdings: holdings,
          progress: progress,
          burned: `${burnedPercentage.toFixed(2)}%`,
          burnedAmount: burnedAmount > 0 ? `${(burnedAmount / 1000000).toFixed(2)}M` : '0M',
          // Additional data for trading
          address: row.token_address,
          routerAddress: row.router_address,
          chainId: row.chain_id,
          networkName: row.network_name,
          currency: chainConfig?.currency || 'ETH',
          totalSupply: row.total_supply,
          listedCount: row.listed_count,
          lastUpdated: row.opensea_data_updated_at,
          createdAt: row.created_at,
          // Real blockchain data
          currentSupply: currentSupply,
          pricePerToken: pricePerToken,
          nativeCurrencyPrice: nativeCurrencyPrice,
          contractBalance: contractBalance,
          curveK: curveK,
          feeRate: feeRate,
        };
      }))).filter(token => token !== null);

      console.log(`Found ${trendingTokens.length} trending tokens for chain ${chainId || 'all'}`);

      return NextResponse.json({
        success: true,
        data: trendingTokens
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Trending tokens API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
