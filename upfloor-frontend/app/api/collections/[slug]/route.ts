import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

    // Query the database for collection data
    // We'll search by collection_name (slug) or token_symbol
    const query = `
      SELECT 
        id,
        collection_name,
        collection_owner,
        chain_id,
        token_address,
        router_address,
        strategy_address,
        royalties_address,
        deployer_address,
        transaction_hash,
        block_number,
        token_symbol,
        collection_image,
        website,
        twitter,
        discord,
        telegram_id,
        opensea_slug,
        total_supply,
        listed_count,
        floor_price,
        market_cap,
        opensea_data_updated_at,
        created_at,
        updated_at,
        CASE chain_id
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
        END as network_name,
        CASE chain_id
          WHEN 1 THEN 'https://etherscan.io'
          WHEN 11155111 THEN 'https://sepolia.etherscan.io'
          WHEN 137 THEN 'https://polygonscan.com'
          WHEN 10 THEN 'https://optimistic.etherscan.io'
          WHEN 42161 THEN 'https://arbiscan.io'
          WHEN 8453 THEN 'https://basescan.org'
          WHEN 10143 THEN 'https://testnet.monadexplorer.com'
          WHEN 33139 THEN 'https://apescan.io'
          WHEN 167000 THEN 'https://taikoscan.io'
          ELSE NULL
        END as explorer_base_url
      FROM collections 
      WHERE LOWER(collection_name) = LOWER($1) 
         OR LOWER(token_symbol) = LOWER($1)
         OR LOWER(opensea_slug) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    const collection = result.rows[0];

    // Convert BYTEA image data back to base64 if it exists
    let imageData = null;
    if (collection.collection_image) {
      try {
        // Convert Buffer to base64 string
        imageData = `data:image/png;base64,${collection.collection_image.toString('base64')}`;
      } catch (error) {
        console.error("Error converting image data:", error);
        // Keep imageData as null if conversion fails
      }
    }

    // Convert floor_price and market_cap from ETH to wei for frontend consistency
    let floorPriceWei = null;
    let marketCapWei = null;
    
    if (collection.floor_price) {
      try {
        floorPriceWei = (Number(collection.floor_price) * 1e18).toString();
      } catch (error) {
        console.error("Error converting floor price to wei:", error);
      }
    }
    
    if (collection.market_cap) {
      try {
        marketCapWei = (Number(collection.market_cap) * 1e18).toString();
      } catch (error) {
        console.error("Error converting market cap to wei:", error);
      }
    }

    // Return the collection data with converted image and market data
    return NextResponse.json({
      collection: {
        ...collection,
        collection_image: imageData,
        floor_price: floorPriceWei,
        market_cap: marketCapWei,
      }
    });

  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: "Collection slug is required" },
        { status: 400 }
      );
    }

    // Extract the fields that can be updated
    const {
      collection_image,
      website,
      opensea_slug,
      twitter,
      discord,
      telegram_id
    } = body;

    // Build the update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (collection_image !== undefined) {
      updateFields.push(`collection_image = $${paramIndex}`);
      // Convert base64 string to Buffer for bytea storage
      if (collection_image && collection_image.trim() !== '') {
        try {
          const imageBuffer = Buffer.from(collection_image, 'base64');
          console.log(`Converting image: ${collection_image.length} chars base64 -> ${imageBuffer.length} bytes buffer`);
          updateValues.push(imageBuffer);
        } catch (error) {
          console.error("Error converting base64 to buffer:", error);
          return NextResponse.json(
            { error: "Invalid image data format" },
            { status: 400 }
          );
        }
      } else {
        console.log("No image data provided, setting to null");
        updateValues.push(null);
      }
      paramIndex++;
    }

    if (website !== undefined) {
      updateFields.push(`website = $${paramIndex}`);
      updateValues.push(website);
      paramIndex++;
    }

    if (opensea_slug !== undefined) {
      updateFields.push(`opensea_slug = $${paramIndex}`);
      updateValues.push(opensea_slug);
      paramIndex++;
    }

    if (twitter !== undefined) {
      updateFields.push(`twitter = $${paramIndex}`);
      updateValues.push(twitter);
      paramIndex++;
    }

    if (discord !== undefined) {
      updateFields.push(`discord = $${paramIndex}`);
      updateValues.push(discord);
      paramIndex++;
    }

    if (telegram_id !== undefined) {
      updateFields.push(`telegram_id = $${paramIndex}`);
      updateValues.push(telegram_id);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);

    // Add the slug parameter for WHERE clause
    updateValues.push(slug);

    const query = `
      UPDATE collections 
      SET ${updateFields.join(', ')}
      WHERE LOWER(collection_name) = LOWER($${paramIndex}) 
         OR LOWER(token_symbol) = LOWER($${paramIndex})
         OR LOWER(opensea_slug) = LOWER($${paramIndex})
      RETURNING id, collection_name, token_symbol
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Collection profile updated successfully",
      collection: result.rows[0]
    });

  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
