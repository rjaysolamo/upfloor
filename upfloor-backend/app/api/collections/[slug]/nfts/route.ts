import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET: Fetch owned NFTs from database
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const query = `
      SELECT owned_nfts, collection_name, collection_owner, chain_id
      FROM collections 
      WHERE LOWER(token_symbol) = LOWER($1)
      LIMIT 1
    `;

    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    const collection = result.rows[0];
    const ownedNfts = collection.owned_nfts || [];

    return NextResponse.json({
      success: true,
      nfts: ownedNfts,
      collectionName: collection.collection_name,
      contractAddress: collection.collection_owner,
      chainId: collection.chain_id,
    });

  } catch (error: any) {
    console.error('Error fetching owned NFTs:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Add NFT to owned list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { tokenId, marketplace } = body;

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    console.log(`➕ Adding NFT #${tokenId} to collection ${slug}`);

    // Add NFT to owned_nfts array
    const query = `
      UPDATE collections 
      SET owned_nfts = owned_nfts || $1::jsonb,
          updated_at = NOW()
      WHERE LOWER(token_symbol) = LOWER($2)
      RETURNING owned_nfts
    `;

    const nftData = {
      tokenId: tokenId.toString(),
      purchasedAt: new Date().toISOString(),
      marketplace: marketplace || 'unknown',
    };

    const result = await pool.query(query, [
      JSON.stringify(nftData),
      slug
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    console.log(`✅ NFT #${tokenId} added successfully`);

    return NextResponse.json({
      success: true,
      ownedNfts: result.rows[0].owned_nfts,
    });

  } catch (error: any) {
    console.error('Error adding NFT:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove NFT from owned list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    console.log(`➖ Removing NFT #${tokenId} from collection ${slug}`);

    // Remove NFT from owned_nfts array
    const query = `
      UPDATE collections 
      SET owned_nfts = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(owned_nfts) elem
        WHERE elem->>'tokenId' != $1
      ),
      updated_at = NOW()
      WHERE LOWER(token_symbol) = LOWER($2)
      RETURNING owned_nfts
    `;

    const result = await pool.query(query, [tokenId.toString(), slug]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    console.log(`✅ NFT #${tokenId} removed successfully`);

    return NextResponse.json({
      success: true,
      ownedNfts: result.rows[0].owned_nfts || [],
    });

  } catch (error: any) {
    console.error('Error removing NFT:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

