import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Fast stats endpoint for Okidori marketplace (Taiko chain 167000)
 * Returns cached data from database for instant loading
 * Indicates if data is stale (>20 minutes old)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contract: string }> }
) {
  try {
    const { contract } = await params;

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    console.log('⚡ Fetching Okidori stats from cache for contract:', contract);
    console.log('📊 Query: SELECT from collections WHERE collection_owner =', contract, 'AND chain_id = 167000');

    // Fetch cached data from database
    // Note: contract parameter is the NFT contract address (collection_owner in DB)
    const query = `
      SELECT 
        total_supply, 
        listed_count, 
        floor_price, 
        market_cap, 
        opensea_data_updated_at,
        (opensea_data_updated_at < NOW() - INTERVAL '20 minutes') as is_stale,
        collection_name,
        token_symbol
      FROM collections 
      WHERE collection_owner = $1 AND chain_id = 167000
      LIMIT 1
    `;

    const result = await pool.query(query, [contract]);
    console.log('📦 Database query returned', result.rows.length, 'rows');

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found in database' },
        { status: 404 }
      );
    }

    const cachedData = result.rows[0];
    
    // Check if data has never been fetched (all null values)
    const hasNoData = cachedData.total_supply === null && 
                      cachedData.listed_count === null && 
                      cachedData.floor_price === null &&
                      cachedData.opensea_data_updated_at === null;
    
    // Check if data looks suspicious (all zeros - likely failed sync)
    const hasSuspiciousData = cachedData.total_supply === 0 && 
                              cachedData.listed_count === 0 && 
                              Number(cachedData.floor_price) === 0;
    
    // If no data exists or data looks suspicious, mark as stale to trigger sync
    const isStale = hasNoData || hasSuspiciousData || cachedData.is_stale;
    
    // Convert ETH to wei for API response
    const floorPriceWei = cachedData.floor_price ? (Number(cachedData.floor_price) * 1e18).toString() : '0';
    const marketCapWei = cachedData.market_cap ? (Number(cachedData.market_cap) * 1e18).toString() : '0';
    
    console.log('📋 Collection found:', {
      name: cachedData.collection_name,
      symbol: cachedData.token_symbol,
      collection_owner: contract
    });

    if (hasNoData) {
      console.log('⚠️ No Okidori data in cache, needs initial sync');
      console.log('   total_supply:', cachedData.total_supply);
      console.log('   listed_count:', cachedData.listed_count);
      console.log('   floor_price:', cachedData.floor_price);
      console.log('   last_updated:', cachedData.opensea_data_updated_at);
    } else if (hasSuspiciousData) {
      console.log('🔍 Suspicious data in cache (all zeros), forcing sync');
      console.log('   total_supply:', cachedData.total_supply);
      console.log('   listed_count:', cachedData.listed_count);
      console.log('   floor_price:', cachedData.floor_price);
    } else {
      console.log('✅ Okidori stats loaded from cache:', {
        total_supply: cachedData.total_supply,
        listed_count: cachedData.listed_count,
        floor_price: cachedData.floor_price,
        is_stale: isStale,
        last_updated: cachedData.opensea_data_updated_at
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        total_supply: cachedData.total_supply || 0,
        listed_count: cachedData.listed_count || 0,
        floor_price: floorPriceWei,
        market_cap: marketCapWei,
        last_updated: cachedData.opensea_data_updated_at,
        is_stale: isStale,
        cached: true
      }
    });

  } catch (error: any) {
    console.error('❌ Error in Okidori stats API:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
