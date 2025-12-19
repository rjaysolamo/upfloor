#!/usr/bin/env node

/**
 * Test Database Connection Script
 * 
 * This script tests the connection to your local PostgreSQL database
 * and displays basic information about the database.
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  console.log(' Testing database connection...\n');

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('Successfully connected to database!\n');

    // Get database info
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version
    `);

    console.log(' Database Information:');
    console.log('  Database:', dbInfo.rows[0].database);
    console.log('  User:', dbInfo.rows[0].user);
    console.log('  Version:', dbInfo.rows[0].version.split('\n')[0]);
    console.log('');

    // Count tables
    const tables = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log('Tables:', tables.rows[0].count);

    // List tables
    const tableList = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    if (tableList.rows.length > 0) {
      console.log('  Tables:');
      tableList.rows.forEach(row => {
        console.log('    -', row.table_name);
      });
    }
    console.log('');

    // Count collections
    const collections = await client.query('SELECT COUNT(*) as count FROM collections');
    console.log(' Collections:', collections.rows[0].count);

    // Get recent collections
    const recentCollections = await client.query(`
      SELECT 
        collection_name, 
        token_symbol, 
        chain_id,
        created_at 
      FROM collections 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (recentCollections.rows.length > 0) {
      console.log('  Recent collections:');
      recentCollections.rows.forEach(row => {
        console.log(`    - ${row.collection_name} (${row.token_symbol}) on chain ${row.chain_id}`);
      });
    } else {
      console.log('  No collections found (database is empty)');
    }
    console.log('');

    // Test views
    const views = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);

    console.log('👁️  Views:', views.rows[0].count);

    client.release();

    console.log('\n All tests passed! Database is ready to use.\n');

  } catch (error) {
    console.error(' Database connection failed!\n');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure PostgreSQL is running');
    console.error('  2. Check your .env.local file has DATABASE_URL set');
    console.error('  3. Verify credentials are correct');
    console.error('  4. Run: ./setup-local-db.sh\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
