import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect()
    
    try {
      const { searchParams } = new URL(request.url)
      const deployerAddress = searchParams.get('deployer')
      
      // OPTIMIZED: Remove base64 encoding from query - images are already stored as text
      let query = `
        SELECT 
          id,
          collection_name,
          token_symbol,
          token_address,
          router_address,
          chain_id,
          created_at,
          deployer_address,
          total_supply,
          floor_price,
          collection_image
        FROM collections 
      `
      
      const params = []
      if (deployerAddress) {
        query += ` WHERE deployer_address = $1`
        params.push(deployerAddress)
      }
      
      query += ` ORDER BY created_at DESC`
      
      const result = await client.query(query, params)

      // OPTIMIZED: Convert BYTEA to base64 data URL if needed, otherwise return as-is
      const collections = result.rows.map(row => {
        let collectionImage = row.collection_image;
        
        // If collection_image is BYTEA (Buffer), convert to base64 data URL
        if (collectionImage && Buffer.isBuffer(collectionImage)) {
          collectionImage = `data:image/png;base64,${collectionImage.toString('base64')}`;
        }
        
        return {
          id: row.id,
          collection_name: row.collection_name,
          token_symbol: row.token_symbol,
          token_address: row.token_address,
          router_address: row.router_address,
          chain_id: row.chain_id,
          created_at: row.created_at,
          deployer_address: row.deployer_address,
          collection_image: collectionImage,
          total_supply: row.total_supply,
          floor_price: row.floor_price
        };
      })

      return NextResponse.json({ 
        collections,
        total: collections.length 
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    )
  }
}
