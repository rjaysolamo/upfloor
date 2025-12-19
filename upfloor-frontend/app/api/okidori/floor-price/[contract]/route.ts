import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const OKIDORI_API_KEY = '99d04c2b44ff0d0139731293ea992774bf30479fd63df14decd650ca5309303c';
const OKIDORI_BASE_URL = 'https://okidori.xyz/api/client-api';

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

        console.log('🔍 Fetching Okidori floor listing for contract:', contract);

        // Always fetch fresh listing data from Okidori for floor price purchases
        // We need the actual listing details (tokenId, seller, listingId) to execute the purchase
        // Sort by price ascending to get the cheapest listing first (floor price)
        const url = `${OKIDORI_BASE_URL}?direction=asc&sort=price&page=1&limit=1&collection=${contract}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'x-api-key': OKIDORI_API_KEY,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Okidori API error:', errorText);
            return NextResponse.json(
                { error: `Failed to fetch data from Okidori: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('📊 Okidori data received:', {
            total: data.total,
            dataLength: data.data?.length,
            firstListing: data.data?.[0]
        });

        // Extract collection data - Okidori API structure
        const listings = data.data || [];
        const totalSupply = data.total || 0;
        const listedCount = listings.length;

        if (!listings || listings.length === 0) {
            console.log('❌ No listings found for this collection');
            return NextResponse.json(
                {
                    success: false,
                    error: 'No listings found for this collection'
                },
                { status: 404 }
            );
        }

        // Find floor price (lowest price listing)
        // Note: sellPrice is in wei (18 decimals) representing TAIKO token
        let floorPrice = '0';
        let floorListing = null;

        if (listings.length > 0) {
            // API returns listings sorted by price ascending, so first is floor
            floorListing = listings[0];
            floorPrice = floorListing.sellPrice || '0';
        }

        // Calculate market cap
        let marketCap = '0';
        if (totalSupply > 0 && floorPrice !== '0') {
            const floorPriceBigInt = BigInt(floorPrice);
            const totalSupplyBigInt = BigInt(totalSupply);
            marketCap = (floorPriceBigInt * totalSupplyBigInt).toString();

            console.log(`Market Cap Calculation: ${floorPrice} (floor) × ${totalSupply} (supply) = ${marketCap}`);
        }

        // Convert wei to ETH for database storage
        const floorPriceEth = floorPrice !== '0' ? (Number(BigInt(floorPrice)) / 1e18).toFixed(18) : '0';
        const marketCapEth = marketCap !== '0' ? (Number(BigInt(marketCap)) / 1e18).toFixed(18) : '0';

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
      RETURNING total_supply, listed_count, floor_price, market_cap, opensea_data_updated_at, collection_name
    `;

        const updateResult = await pool.query(updateQuery, [
            totalSupply,
            listedCount,
            floorPriceEth,
            marketCapEth,
            contract
        ]);

        if (updateResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Collection not found in database' },
                { status: 404 }
            );
        }

        const updatedData = updateResult.rows[0];

        // Convert ETH back to wei for API response
        const floorPriceWei = updatedData.floor_price ? (Number(updatedData.floor_price) * 1e18).toString() : '0';
        const marketCapWei = updatedData.market_cap ? (Number(updatedData.market_cap) * 1e18).toString() : '0';

        return NextResponse.json({
            success: true,
            listing: floorListing ? {
                tokenId: floorListing.nft?.tokenId || '',
                contract: contract,
                price: floorPrice,
                sellPrice: floorPrice, // Raw on-chain price in wei (18 decimals)
                priceDecimal: (Number(BigInt(floorPrice)) / 1e18).toString(),
                currency: 'TAIKO',
                maker: floorListing.sellerWallet || '',
                seller: floorListing.sellerWallet || '',
                listingId: floorListing.listingIdOnChain || floorListing.id || '', // Prefer on-chain ID
                listingIdOnChain: floorListing.listingIdOnChain || floorListing.id || '', // On-chain listing ID for buyNFT
                orderId: floorListing.listingIdOnChain?.toString() || floorListing.id?.toString() || '',
                validUntil: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // Default 30 days from now
                source: 'okidori',
                kind: 'okidori-listing',
                rawData: floorListing,
            } : null,
            collection: {
                name: updatedData.collection_name,
                floorPrice: (Number(updatedData.floor_price)).toString(),
                floorPriceRaw: floorPriceWei,
                supply: updatedData.total_supply,
                onSaleCount: updatedData.listed_count,
                marketCap: (Number(updatedData.market_cap)).toString(),
            },
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
        console.error('❌ Error in Okidori floor price API:', error);
        return NextResponse.json(
            { error: error?.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
