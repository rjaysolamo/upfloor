import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const OKIDORI_API_KEY = '99d04c2b44ff0d0139731293ea992774bf30479fd63df14decd650ca5309303c';
const OKIDORI_BASE_URL = 'https://okidori.xyz/api/client-api';

/**
 * Sync endpoint for Okidori marketplace (Taiko chain 167000)
 * Forces a fresh fetch from Okidori API and updates database
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

    console.log('🔄 Syncing Okidori data for contract:', contract);
    console.log('🌐 Okidori API URL:', `${OKIDORI_BASE_URL}?collection=${contract}`);

    // Fetch fresh data from Okidori
    const url = `${OKIDORI_BASE_URL}?direction=desc&sort=listing&page=1&limit=100&collection=${contract}`;
    
    console.log('📡 Fetching from Okidori API...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': OKIDORI_API_KEY,
      },
    });

    console.log('📥 Okidori API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Okidori API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: url
      });
      return NextResponse.json(
        { 
          error: `Failed to fetch data from Okidori: ${response.status}`,
          details: errorText,
          url: url
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log the full response for debugging
    console.log('📦 Full Okidori API response:', JSON.stringify(data, null, 2));
    console.log('📊 Okidori data received for sync');
    console.log('   Raw data keys:', Object.keys(data));
    console.log('   Listings count:', data.data?.length || 0);
    console.log('   Total count:', data.total || 0);

    // Extract collection data - Okidori API structure is different
    const listings = data.data || []; // API returns "data" not "listings"
    const totalSupply = data.total || 0; // Use "total" as supply indicator
    const listedCount = listings.length;
    
    console.log('📈 Extracted data:', {
      totalSupply,
      listedCount,
      hasListings: listings.length > 0
    });
    
    // Find floor price (lowest price listing)
    let floorPrice = '0';
    
    if (listings.length > 0) {
      console.log('💰 Getting floor price from first listing (API is pre-sorted)');
      console.log('   First listing (floor):', {
        id: listings[0].id,
        tokenId: listings[0].nft?.tokenId,
        sellPrice: listings[0].sellPrice,
        seller: listings[0].sellerWallet
      });
      
      // API returns listings sorted by price ascending, so first is floor
      floorPrice = listings[0].sellPrice || '0';
      console.log('   Floor price:', floorPrice, 'wei');
      console.log('   Floor price in TAIKO:', (Number(floorPrice) / 1e18).toFixed(6));
    } else {
      console.log('⚠️ No listings found, floor price = 0');
    }

    // Calculate market cap
    let marketCap = '0';
    if (totalSupply > 0 && floorPrice !== '0') {
      const floorPriceBigInt = BigInt(floorPrice);
      const totalSupplyBigInt = BigInt(totalSupply);
      marketCap = (floorPriceBigInt * totalSupplyBigInt).toString();
      console.log('💎 Market cap calculated:', (Number(marketCap) / 1e18).toFixed(4), 'TAIKO');
    }

    // Convert wei to ETH for database storage
    const floorPriceEth = floorPrice !== '0' ? (Number(BigInt(floorPrice)) / 1e18).toFixed(18) : '0';
    const marketCapEth = marketCap !== '0' ? (Number(BigInt(marketCap)) / 1e18).toFixed(18) : '0';
    
    console.log('💾 Preparing to update database:', {
      totalSupply,
      listedCount,
      floorPriceEth: floorPriceEth.substring(0, 10) + '...',
      marketCapEth: marketCapEth.substring(0, 10) + '...',
      contract
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
      WHERE collection_owner = $5 AND chain_id = 167000
      RETURNING total_supply, listed_count, floor_price, market_cap, opensea_data_updated_at
    `;
    
    const updateResult = await pool.query(updateQuery, [
      totalSupply,
      listedCount,
      floorPriceEth,
      marketCapEth,
      contract
    ]);

    console.log('📝 Database update result:', updateResult.rows.length, 'rows affected');

    if (updateResult.rows.length === 0) {
      console.error('❌ Collection not found in database for contract:', contract);
      return NextResponse.json(
        { error: 'Collection not found in database' },
        { status: 404 }
      );
    }

    const updatedData = updateResult.rows[0];
    console.log('✅ Database updated successfully:', {
      total_supply: updatedData.total_supply,
      listed_count: updatedData.listed_count,
      floor_price: updatedData.floor_price,
      last_updated: updatedData.opensea_data_updated_at
    });

    // Convert ETH back to wei for API response
    const floorPriceWei = updatedData.floor_price ? (Number(updatedData.floor_price) * 1e18).toString() : '0';
    const marketCapWei = updatedData.market_cap ? (Number(updatedData.market_cap) * 1e18).toString() : '0';

    console.log('✅ Okidori data synced successfully');

    return NextResponse.json({
      success: true,
      data: {
        total_supply: updatedData.total_supply,
        listed_count: updatedData.listed_count,
        floor_price: floorPriceWei,
        market_cap: marketCapWei,
        last_updated: updatedData.opensea_data_updated_at,
        is_stale: false,
        cached: false
      }
    });

  } catch (error: any) {
    console.error('❌ Error in Okidori sync API:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
