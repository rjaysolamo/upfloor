import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Magic Eden API configuration
const MAGICEDEN_API_KEY = 'f6142c9c-d468-44e8-8ef8-1911a74a5345';
const MAGICEDEN_BASE_URL = 'https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet';

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

    if (!MAGICEDEN_API_KEY) {
      return NextResponse.json(
        { error: "Magic Eden API key not configured" },
        { status: 500 }
      );
    }

    console.log('🔄 Syncing Magic Eden data for contract:', contract);

    // Check if we already have recent Magic Eden data (within last 20 minutes)
    const existingDataQuery = `
      SELECT total_supply, listed_count, floor_price, market_cap, opensea_data_updated_at
      FROM collections 
      WHERE collection_owner = $1 
        AND chain_id = 10143
        AND opensea_data_updated_at > NOW() - INTERVAL '20 minutes'
      LIMIT 1
    `;

    const existingResult = await pool.query(existingDataQuery, [contract.toLowerCase()]);

    // If we have recent data, return it
    if (existingResult.rows.length > 0) {
      const existingData = existingResult.rows[0];
      
      // Convert to wei for API response (frontend expects wei)
      const floorPriceWei = existingData.floor_price ? (Number(existingData.floor_price) * 1e18).toString() : '0';
      const marketCapWei = existingData.market_cap ? (Number(existingData.market_cap) * 1e18).toString() : '0';
      
      console.log('✅ Returning cached Magic Eden data');
      
      return NextResponse.json({
        success: true,
        data: {
          total_supply: existingData.total_supply,
          listed_count: existingData.listed_count,
          floor_price: floorPriceWei,
          market_cap: marketCapWei,
          last_updated: existingData.opensea_data_updated_at,
          cached: true
        }
      });
    }

    // Fetch fresh data from Magic Eden
    console.log('🔍 Fetching fresh data from Magic Eden...');
    
    const collectionUrl = `${MAGICEDEN_BASE_URL}/collections/v7?id=${contract}&includeMintStages=false&includeSecurityConfigs=false&normalizeRoyalties=false&useNonFlaggedFloorAsk=false&sortBy=allTimeVolume&limit=1`;
    
    const collectionResponse = await fetch(collectionUrl, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'Authorization': MAGICEDEN_API_KEY,
      },
    });

    if (!collectionResponse.ok) {
      const errorText = await collectionResponse.text();
      console.error('Magic Eden API error:', errorText);
      return NextResponse.json(
        { error: "Failed to fetch collection data from Magic Eden" },
        { status: collectionResponse.status }
      );
    }

    const collectionData = await collectionResponse.json();

    if (!collectionData.collections || collectionData.collections.length === 0) {
      return NextResponse.json(
        { error: "Collection not found on Magic Eden" },
        { status: 404 }
      );
    }

    const collection = collectionData.collections[0];

    // Extract data
    const totalSupply = parseInt(collection.supply || collection.tokenCount || '0');
    const listedCount = parseInt(collection.onSaleCount || '0');
    let floorPrice = '0';
    let marketCap = '0';
    
    console.log(`Magic Eden Data for ${contract}:`, {
      totalSupply,
      listedCount,
      hasFloorAsk: !!collection.floorAsk
    });

    // Get floor price from floorAsk
    if (collection.floorAsk && collection.floorAsk.price && collection.floorAsk.price.amount) {
      floorPrice = collection.floorAsk.price.amount.raw;
    }
    
    // Calculate market cap: floor_price * total_supply
    if (totalSupply > 0 && floorPrice !== '0') {
      const floorPriceBigInt = BigInt(floorPrice);
      const totalSupplyBigInt = BigInt(totalSupply);
      marketCap = (floorPriceBigInt * totalSupplyBigInt).toString();
      
      console.log(`Market Cap Calculation: ${floorPrice} (floor) × ${totalSupply} (supply) = ${marketCap}`);
      console.log(`Market Cap in MON: ${(Number(floorPriceBigInt) / 1e18 * totalSupply).toFixed(4)} MON`);
    }

    // Convert wei to MON/ETH for database storage (to avoid precision overflow)
    const floorPriceMon = floorPrice !== '0' ? (Number(BigInt(floorPrice)) / 1e18).toFixed(18) : '0';
    const marketCapMon = marketCap !== '0' ? (Number(BigInt(marketCap)) / 1e18).toFixed(18) : '0';
    
    console.log(`Converting to MON for storage:`, {
      floorPriceWei: floorPrice,
      floorPriceMon,
      marketCapWei: marketCap,
      marketCapMon
    });

    // Update database with new data
    const updateQuery = `
      UPDATE collections 
      SET 
        total_supply = $1,
        listed_count = $2,
        floor_price = $3,
        market_cap = $4,
        opensea_data_updated_at = NOW(),
        updated_at = NOW()
      WHERE collection_owner = $5 AND chain_id = 10143
      RETURNING total_supply, listed_count, floor_price, market_cap, opensea_data_updated_at
    `;
    
    const updateResult = await pool.query(updateQuery, [
      totalSupply,
      listedCount,
      floorPriceMon,
      marketCapMon,
      contract.toLowerCase()
    ]);

    if (updateResult.rows.length === 0) {
      console.error('❌ Collection not found in database');
      return NextResponse.json(
        { error: "Collection not found in database" },
        { status: 404 }
      );
    }

    const updatedData = updateResult.rows[0];

    // Convert back to wei for API response (frontend expects wei)
    const floorPriceWei = updatedData.floor_price ? (Number(updatedData.floor_price) * 1e18).toString() : '0';
    const marketCapWei = updatedData.market_cap ? (Number(updatedData.market_cap) * 1e18).toString() : '0';

    console.log('✅ Database updated successfully');

    return NextResponse.json({
      success: true,
      data: {
        total_supply: updatedData.total_supply,
        listed_count: updatedData.listed_count,
        floor_price: floorPriceWei,
        market_cap: marketCapWei,
        last_updated: updatedData.opensea_data_updated_at,
        cached: false
      }
    });

  } catch (error: any) {
    console.error("Magic Eden sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

