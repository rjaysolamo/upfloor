// Database utilities for collections
import { Pool } from 'pg';

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Constants for image validation
const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Utility function to validate and convert base64 image to Buffer
function validateAndConvertImage(base64String: string): Buffer | null {
  if (!base64String) return null;
  
  // Check if it's a valid base64 data URL
  const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
  if (!base64Regex.test(base64String)) {
    throw new Error('Invalid image format. Only JPEG, PNG, GIF, and WebP are supported.');
  }
  
  // Extract the base64 data
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  
  // Validate base64 format
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
    throw new Error('Invalid base64 format.');
  }
  
  // Convert to buffer and check size
  const buffer = Buffer.from(base64Data, 'base64');
  
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image size exceeds 500KB limit. Current size: ${Math.round(buffer.length / 1024)}KB`);
  }
  
  return buffer;
}

export interface CollectionData {
  collection_name: string;
  collection_owner: string;
  chain_id: number;
  token_address: string;
  router_address: string;
  strategy_address: string;
  royalties_address: string;
  deployer_address: string;
  transaction_hash: string;
  block_number: number;
  token_symbol: string;
  royalty_percentage: number; // Royalty percentage (e.g., 3.00 for 3%)
  collection_image?: string; // Base64 encoded image string (max 500KB)
  website?: string;
  twitter?: string;
  discord?: string;
  telegram_id?: string;
  opensea_slug?: string;
  total_supply?: number; // Total supply from OpenSea
  listed_count?: number; // Number of items currently listed for sale
  floor_price?: string; // Floor price (stored in ETH, converted to wei for API)
  market_cap?: string; // Market cap in ETH (floor_price * total_supply)
}

export interface CollectionWithChainInfo extends Omit<CollectionData, 'collection_image'> {
  id: number;
  network_name: string;
  explorer_base_url: string;
  created_at: Date;
  updated_at: Date;
  collection_image?: string; // Base64 string for frontend use
}

// Save a new collection to the database
export async function saveCollection(data: CollectionData): Promise<CollectionWithChainInfo> {
  const client = await pool.connect();
  
  try {
    // Validate and convert image if provided
    let imageBuffer: Buffer | null = null;
    if (data.collection_image) {
      try {
        imageBuffer = validateAndConvertImage(data.collection_image);
        console.log(`Image converted successfully, size: ${imageBuffer?.length} bytes`);
      } catch (error) {
        console.error('Image validation failed:', error);
        throw error;
      }
    }

    const query = `
      INSERT INTO collections (
        collection_name, collection_owner, chain_id, token_address,
        router_address, strategy_address, royalties_address, deployer_address,
        transaction_hash, block_number, token_symbol, royalty_percentage, collection_image, website, twitter, discord, telegram_id, opensea_slug
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      data.collection_name,
      data.collection_owner,
      data.chain_id,
      data.token_address,
      data.router_address,
      data.strategy_address,
      data.royalties_address,
      data.deployer_address,
      data.transaction_hash,
      data.block_number,
      data.token_symbol,
      data.royalty_percentage,
      imageBuffer,
      data.website || null,
      data.twitter || null,
      data.discord || null,
      data.telegram_id || null,
      data.opensea_slug || null,
    ];

    console.log('Executing query with values:', {
      collection_name: data.collection_name,
      collection_owner: data.collection_owner,
      chain_id: data.chain_id,
      token_address: data.token_address,
      router_address: data.router_address,
      strategy_address: data.strategy_address,
      royalties_address: data.royalties_address,
      deployer_address: data.deployer_address,
      transaction_hash: data.transaction_hash,
      block_number: data.block_number,
      token_symbol: data.token_symbol,
      image_size: imageBuffer?.length || 0,
      website: data.website,
      twitter: data.twitter,
      discord: data.discord,
      telegram_id: data.telegram_id,
      opensea_slug: data.opensea_slug,
    });
    
    const result = await client.query(query, values);
    const row = result.rows[0];

    // Convert Buffer back to base64 string for frontend
    if (row.collection_image) {
      row.collection_image = `data:image/jpeg;base64,${row.collection_image.toString('base64')}`;
    }

    return row;
  } catch (error) {
    console.error('Database error in saveCollection:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get collection by transaction hash and chain ID
export async function getCollectionByTxHash(txHash: string, chainId: number): Promise<CollectionWithChainInfo | null> {
  const client = await pool.connect();

  try {
    const query = `
      SELECT * FROM collections_with_chain_info
      WHERE transaction_hash = $1 AND chain_id = $2
    `;

    const result = await client.query(query, [txHash, chainId]);
    const row = result.rows[0];

    if (row && row.collection_image) {
      row.collection_image = `data:image/jpeg;base64,${row.collection_image.toString('base64')}`;
    }

    return row || null;
  } finally {
    client.release();
  }
}

// Get collections by owner address
export async function getCollectionsByOwner(ownerAddress: string): Promise<CollectionWithChainInfo[]> {
  const client = await pool.connect();

  try {
    const query = `
      SELECT * FROM collections_with_chain_info
      WHERE collection_owner = $1
      ORDER BY created_at DESC
    `;

    const result = await client.query(query, [ownerAddress]);
    const rows = result.rows;

    // Convert Buffer back to base64 strings for frontend
    rows.forEach(row => {
      if (row.collection_image) {
        row.collection_image = `data:image/jpeg;base64,${row.collection_image.toString('base64')}`;
      }
    });

    return rows;
  } finally {
    client.release();
  }
}

// Get collections by chain ID
export async function getCollectionsByChain(chainId: number): Promise<CollectionWithChainInfo[]> {
  const client = await pool.connect();

  try {
    const query = `
      SELECT * FROM collections_with_chain_info
      WHERE chain_id = $1
      ORDER BY created_at DESC
    `;

    const result = await client.query(query, [chainId]);
    const rows = result.rows;

    // Convert Buffer back to base64 strings for frontend
    rows.forEach(row => {
      if (row.collection_image) {
        row.collection_image = `data:image/jpeg;base64,${row.collection_image.toString('base64')}`;
      }
    });

    return rows;
  } finally {
    client.release();
  }
}

// Get recent collections
export async function getRecentCollections(limit: number = 10): Promise<CollectionWithChainInfo[]> {
  const client = await pool.connect();

  try {
    const query = `
      SELECT * FROM collections_with_chain_info
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await client.query(query, [limit]);
    const rows = result.rows;

    // Convert Buffer back to base64 strings for frontend
    rows.forEach(row => {
      if (row.collection_image) {
        row.collection_image = `data:image/jpeg;base64,${row.collection_image.toString('base64')}`;
      }
    });

    return rows;
  } finally {
    client.release();
  }
}

// Update collection social links
export async function updateCollectionSocials(
  id: number,
  socials: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram_id?: string;
    opensea_slug?: string;
    collection_image?: string | null;
  }
): Promise<CollectionWithChainInfo | null> {
  const client = await pool.connect();
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (socials.website !== undefined) {
      updates.push(`website = $${paramCount++}`);
      values.push(socials.website);
    }
    if (socials.twitter !== undefined) {
      updates.push(`twitter = $${paramCount++}`);
      values.push(socials.twitter);
    }
    if (socials.discord !== undefined) {
      updates.push(`discord = $${paramCount++}`);
      values.push(socials.discord);
    }
    if (socials.telegram_id !== undefined) {
      updates.push(`telegram_id = $${paramCount++}`);
      values.push(socials.telegram_id);
    }
    if (socials.opensea_slug !== undefined) {
      updates.push(`opensea_slug = $${paramCount++}`);
      values.push(socials.opensea_slug);
    }
    if (socials.collection_image !== undefined) {
      updates.push(`collection_image = $${paramCount++}`);
      // Validate and convert image if provided
      let imageBuffer: Buffer | null = null;
      if (socials.collection_image) {
        imageBuffer = validateAndConvertImage(socials.collection_image);
      }
      values.push(imageBuffer);
    }
    
    if (updates.length === 0) {
      return null;
    }
    
    values.push(id);
    
    const query = `
      UPDATE collections 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    const row = result.rows[0];

    if (row && row.collection_image) {
      row.collection_image = `data:image/jpeg;base64,${row.collection_image.toString('base64')}`;
    }

    return row || null;
  } finally {
    client.release();
  }
}

// Close the database connection pool
export async function closePool(): Promise<void> {
  await pool.end();
}
