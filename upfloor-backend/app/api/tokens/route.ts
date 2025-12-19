import { NextRequest, NextResponse } from "next/server";
import { Pool } from 'pg';
import { getChainConfig } from "../../lib/chainlist";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');

    let query = `
      SELECT 
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

    query += ` ORDER BY c.created_at DESC`;

    const client = await pool.connect();
    try {
      const result = await client.query(query, params);

      // Transform the data to include chain-specific currency
      const tokens = result.rows.map(row => {
        const chainConfig = getChainConfig(row.chain_id);

        // Convert BYTEA to base64 data URL if image exists
        let imageUrl = null;
        if (row.collection_image) {
          const base64 = Buffer.from(row.collection_image).toString('base64');
          imageUrl = `data:image/png;base64,${base64}`;
        }

        return {
          address: row.token_address,
          symbol: row.token_symbol,
          name: row.collection_name,
          routerAddress: row.router_address,
          chainId: row.chain_id,
          networkName: row.network_name,
          currency: chainConfig?.currency || 'ETH',
          imageUrl: imageUrl,
          totalSupply: row.total_supply,
          listedCount: row.listed_count,
          floorPrice: row.floor_price,
          marketCap: row.market_cap,
          lastUpdated: row.opensea_data_updated_at,
        };
      });

      console.log(`Found ${tokens.length} tokens for chain ${chainId || 'all'}:`, tokens.map(t => `${t.symbol} (${t.chainId})`));

      return NextResponse.json({
        success: true,
        data: tokens
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Tokens API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
