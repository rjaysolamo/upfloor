import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Database connection with optimized pool settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Fast stats endpoint - fetches directly from database cache
 * No external API calls, extremely fast response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contract: string }> }
) {
  try {
    const { contract } = await params;

    if (!contract) {
      return NextResponse.json(
        { error: "Contract address is required" },
        { status: 400 }
      );
    }

    // Direct database query - no external API calls
    // Works for all chains, not just Monad
    const statsQuery = `
      SELECT 
        total_supply, 
        listed_count, 
        floor_price, 
        market_cap, 
        opensea_data_updated_at,
        chain_id,
        EXTRACT(EPOCH FROM (NOW() - opensea_data_updated_at)) as age_seconds
      FROM collections 
      WHERE collection_owner = $1
      LIMIT 1
    `;

    const result = await pool.query(statsQuery, [contract.toLowerCase()]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    const data = result.rows[0];
    
    // Convert to wei for API response (frontend expects wei)
    const floorPriceWei = data.floor_price ? (Number(data.floor_price) * 1e18).toString() : '0';
    const marketCapWei = data.market_cap ? (Number(data.market_cap) * 1e18).toString() : '0';
    
    // Determine if data is stale (older than 20 minutes)
    const isStale = !data.opensea_data_updated_at || data.age_seconds > 1200; // 20 minutes = 1200 seconds

    return NextResponse.json({
      success: true,
      data: {
        total_supply: data.total_supply,
        listed_count: data.listed_count,
        floor_price: floorPriceWei,
        market_cap: marketCapWei,
        last_updated: data.opensea_data_updated_at,
        is_stale: isStale,
        age_seconds: Math.floor(data.age_seconds || 0),
        chain_id: data.chain_id,
      }
    });

  } catch (error: any) {
    console.error("Stats fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

