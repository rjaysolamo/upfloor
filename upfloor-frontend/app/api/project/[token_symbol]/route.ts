import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { token_symbol: string } }
) {
  try {
    const token_symbol = params.token_symbol.toUpperCase();

    const client = await pool.connect();

    try {
      // Query collections_with_chain_info view by token_symbol
      const query = `
        SELECT * FROM collections_with_chain_info
        WHERE UPPER(token_symbol) = $1
        LIMIT 1
      `;

      const result = await client.query(query, [token_symbol]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Project not found', message: `No project found with symbol ${token_symbol}` },
          { status: 404 }
        );
      }

      const row = result.rows[0];

      // Convert Buffer back to base64 string for frontend
      if (row.collection_image) {
        row.collection_image = `data:image/jpeg;base64,${row.collection_image.toString('base64')}`;
      }

      return NextResponse.json({
        success: true,
        project: row
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch project details' },
      { status: 500 }
    );
  }
}
