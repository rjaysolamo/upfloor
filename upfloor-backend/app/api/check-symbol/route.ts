import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const chainId = searchParams.get('chainId');

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter is required" },
        { status: 400 }
      );
    }

    // Normalize symbol (uppercase, trim)
    const normalizedSymbol = symbol.trim().toUpperCase();

    // Check if symbol exists in database
    let query = `
      SELECT token_symbol, collection_name, chain_id, network_name, created_at
      FROM collections_with_chain_info 
      WHERE UPPER(token_symbol) = $1
    `;
    let params = [normalizedSymbol];

    // If chainId is provided, also filter by chain
    if (chainId) {
      query += ` AND chain_id = $2`;
      params.push(chainId);
    }

    query += ` ORDER BY created_at DESC LIMIT 5`;

    const result = await pool.query(query, params);

    const isAvailable = result.rows.length === 0;
    const existingTokens = result.rows.map(row => ({
      symbol: row.token_symbol,
      name: row.collection_name,
      chainId: row.chain_id,
      networkName: row.network_name,
      createdAt: row.created_at
    }));

    return NextResponse.json({
      success: true,
      symbol: normalizedSymbol,
      isAvailable,
      existingTokens,
      message: isAvailable 
        ? `Symbol "${normalizedSymbol}" is available`
        : `Symbol "${normalizedSymbol}" is already in use`
    });

  } catch (error) {
    console.error("Error checking symbol availability:", error);
    return NextResponse.json(
      { error: "Failed to check symbol availability" },
      { status: 500 }
    );
  }
}
