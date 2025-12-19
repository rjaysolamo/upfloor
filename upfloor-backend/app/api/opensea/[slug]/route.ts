import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// OpenSea API configuration
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || 'b356a19f92d745489960e6336768677c';
const OPENSEA_BASE_URL = 'https://api.opensea.io/api/v2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Collection slug is required" },
        { status: 400 }
      );
    }

    // Check if we already have recent OpenSea data (within last 20 minutes)
    const existingDataQuery = `
      SELECT total_supply, listed_count, floor_price, market_cap, opensea_data_updated_at
      FROM collections 
      WHERE opensea_slug = $1 
        AND opensea_data_updated_at > NOW() - INTERVAL '20 minutes'
      LIMIT 1
    `;

    const existingResult = await pool.query(existingDataQuery, [slug]);

    // If we have recent data, return it
    if (existingResult.rows.length > 0) {
      const existingData = existingResult.rows[0];
      
      // Convert ETH back to wei for API response (frontend expects wei)
      const floorPriceWei = existingData.floor_price ? (Number(existingData.floor_price) * 1e18).toString() : '0';
      const marketCapWei = existingData.market_cap ? (Number(existingData.market_cap) * 1e18).toString() : '0';
      
      return NextResponse.json({
        success: true,
        data: {
          total_supply: existingData.total_supply,
          listed_count: existingData.listed_count,
          floor_price: floorPriceWei, // Return in wei format for frontend
          market_cap: marketCapWei,   // Return in wei format for frontend
          last_updated: existingData.opensea_data_updated_at,
          cached: true
        }
      });
    }

    // Fetch fresh data from OpenSea
    const [collectionResponse, listingsResponse] = await Promise.all([
      // Fetch collection data
      fetch(`${OPENSEA_BASE_URL}/collections/${slug}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': OPENSEA_API_KEY
        }
      }),
      // Fetch listings data for floor price
      fetch(`${OPENSEA_BASE_URL}/listings/collection/${slug}/all`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': OPENSEA_API_KEY
        }
      })
    ]);

    if (!collectionResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch collection data from OpenSea" },
        { status: collectionResponse.status }
      );
    }

    const collectionData = await collectionResponse.json();
    const listingsData = listingsResponse.ok ? await listingsResponse.json() : { listings: [] };

    // Extract data
    const totalSupply = collectionData.total_supply || 0;
    const listedCount = listingsData.listings?.length || 0;
    let floorPrice = '0';
    let marketCap = '0';
    
    console.log(`OpenSea Data for ${slug}:`, {
      totalSupply,
      listedCount,
      listingsCount: listedCount
    });

    // Calculate floor price from listings
    if (listingsData.listings && listingsData.listings.length > 0) {
      // Find the lowest price listing
      const lowestPriceListing = listingsData.listings.reduce((lowest: any, current: any) => {
        const currentPrice = BigInt(current.price.current.value);
        const lowestPrice = BigInt(lowest.price.current.value);
        return currentPrice < lowestPrice ? current : lowest;
      });

      floorPrice = lowestPriceListing.price.current.value;
    }
    
    // Calculate market cap: floor_price * total_supply
    // This is the standard definition of market cap for NFT collections
    if (totalSupply > 0 && floorPrice !== '0') {
      const floorPriceBigInt = BigInt(floorPrice);
      const totalSupplyBigInt = BigInt(totalSupply);
      marketCap = (floorPriceBigInt * totalSupplyBigInt).toString();
      
      // Debug logging
      console.log(`Market Cap Calculation: ${floorPrice} (floor) × ${totalSupply} (supply) = ${marketCap}`);
      console.log(`Market Cap in ETH: ${(Number(floorPriceBigInt) / 1e18 * totalSupply).toFixed(4)} ETH`);
    }

    // Convert wei to ETH for database storage (to avoid precision overflow)
    const floorPriceEth = floorPrice !== '0' ? (Number(BigInt(floorPrice)) / 1e18).toFixed(18) : '0';
    const marketCapEth = marketCap !== '0' ? (Number(BigInt(marketCap)) / 1e18).toFixed(18) : '0';
    
    console.log(`Converting to ETH for storage:`, {
      floorPriceWei: floorPrice,
      floorPriceEth,
      marketCapWei: marketCap,
      marketCapEth
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
      WHERE opensea_slug = $5
      RETURNING total_supply, listed_count, floor_price, market_cap, opensea_data_updated_at
    `;
    
    const updateResult = await pool.query(updateQuery, [
      totalSupply,
      listedCount,
      floorPriceEth, // Store in ETH format
      marketCapEth,  // Store in ETH format
      slug
    ]);

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Collection not found in database" },
        { status: 404 }
      );
    }

    const updatedData = updateResult.rows[0];

    // Convert ETH back to wei for API response (frontend expects wei)
    const floorPriceWei = updatedData.floor_price ? (Number(updatedData.floor_price) * 1e18).toString() : '0';
    const marketCapWei = updatedData.market_cap ? (Number(updatedData.market_cap) * 1e18).toString() : '0';

    return NextResponse.json({
      success: true,
      data: {
        total_supply: updatedData.total_supply,
        listed_count: updatedData.listed_count,
        floor_price: floorPriceWei, // Return in wei format for frontend
        market_cap: marketCapWei,   // Return in wei format for frontend
        last_updated: updatedData.opensea_data_updated_at,
        cached: false
      }
    });

  } catch (error) {
    console.error("OpenSea API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
