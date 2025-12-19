import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

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
                { error: "Contract address is required" },
                { status: 400 }
            );
        }

        // Check if we already have recent Okidori data (within last 20 minutes)
        // Note: contract parameter is the NFT contract address (collection_owner in DB)
        const existingDataQuery = `
      SELECT total_supply, listed_count, floor_price, market_cap, opensea_data_updated_at
      FROM collections 
      WHERE collection_owner = $1 
        AND chain_id = 167000
        AND opensea_data_updated_at > NOW() - INTERVAL '20 minutes'
      LIMIT 1
    `;

        const existingResult = await pool.query(existingDataQuery, [contract]);

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
                    floor_price: floorPriceWei,
                    market_cap: marketCapWei,
                    last_updated: existingData.opensea_data_updated_at,
                    cached: true
                }
            });
        }

        // Fetch fresh data from Okidori
        const url = `${OKIDORI_BASE_URL}?direction=desc&sort=listing&page=1&limit=100&collection=${contract}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'x-api-key': OKIDORI_API_KEY,
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to fetch collection data from Okidori" },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract data - Okidori API structure
        const totalSupply = data.total || 0;
        const listedCount = data.data?.length || 0;
        let floorPrice = '0';
        let marketCap = '0';

        console.log(`Okidori Data for ${contract}:`, {
            totalSupply,
            listedCount,
            listingsCount: listedCount
        });

        // Calculate floor price from listings
        // Note: sellPrice is in wei (18 decimals) representing TAIKO token
        // API returns listings sorted by price ascending, so first is floor
        if (data.data && data.data.length > 0) {
            floorPrice = data.data[0].sellPrice || '0';
        }

        // Calculate market cap: floor_price * total_supply
        if (totalSupply > 0 && floorPrice !== '0') {
            const floorPriceBigInt = BigInt(floorPrice);
            const totalSupplyBigInt = BigInt(totalSupply);
            marketCap = (floorPriceBigInt * totalSupplyBigInt).toString();

            console.log(`Market Cap Calculation: ${floorPrice} (floor) × ${totalSupply} (supply) = ${marketCap}`);
            console.log(`Market Cap in ETH: ${(Number(floorPriceBigInt) / 1e18 * totalSupply).toFixed(4)} ETH`);
        }

        // Convert wei to ETH for database storage
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
                floor_price: floorPriceWei,
                market_cap: marketCapWei,
                last_updated: updatedData.opensea_data_updated_at,
                cached: false
            }
        });

    } catch (error) {
        console.error("Okidori API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
