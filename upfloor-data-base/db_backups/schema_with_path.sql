SET search_path TO public;
-- =====================================================
-- BidBop Production Database Schema
-- Complete schema with all tables, constraints, and indexes
-- =====================================================

-- Create the collections table
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    
    -- Blockchain deployment details (mandatory)
    collection_name VARCHAR(255) NOT NULL,
    collection_owner VARCHAR(42) NOT NULL, -- Ethereum address (0x...)
    chain_id INTEGER NOT NULL,
    token_address VARCHAR(42) NOT NULL, -- Deployed token contract address
    router_address VARCHAR(42) NOT NULL, -- Router contract address
    strategy_address VARCHAR(42) NOT NULL, -- Strategy contract address
    royalties_address VARCHAR(42) NOT NULL, -- Royalties recipient address
    deployer_address VARCHAR(42) NOT NULL, -- Address that deployed the contract
    transaction_hash VARCHAR(66) NOT NULL, -- Deployment transaction hash
    block_number BIGINT NOT NULL, -- Block number where deployed
    
    -- Token details
    token_symbol VARCHAR(10) NOT NULL,

    -- Collection image (base64 encoded, max 500KB)
    collection_image BYTEA, -- Base64 encoded image data stored as binary (max ~500KB)

    -- Social links (optional)
    website VARCHAR(500),
    twitter VARCHAR(100), -- Twitter/X handle (without @)
    discord VARCHAR(500), -- Discord invite link
    telegram_id VARCHAR(100), -- Telegram username or group ID
    opensea_slug VARCHAR(100), -- OpenSea collection slug (e.g., "cool-cats-nft")
    
    -- OpenSea market data (optional)
    total_supply INTEGER, -- Total supply from OpenSea
    listed_count INTEGER, -- Number of items currently listed for sale
    floor_price DECIMAL(28,18), -- Floor price in ETH (18 decimal places, up to 999,999,999.999999999999999999)
    market_cap DECIMAL(28,18), -- Market cap in ETH (floor_price * total_supply)
    opensea_data_updated_at TIMESTAMP WITH TIME ZONE, -- When OpenSea data was last fetched
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_ethereum_address CHECK (
        collection_owner ~ '^0x[a-fA-F0-9]{40}$' AND
        token_address ~ '^0x[a-fA-F0-9]{40}$' AND
        router_address ~ '^0x[a-fA-F0-9]{40}$' AND
        strategy_address ~ '^0x[a-fA-F0-9]{40}$' AND
        royalties_address ~ '^0x[a-fA-F0-9]{40}$' AND
        deployer_address ~ '^0x[a-fA-F0-9]{40}$'
    ),
    CONSTRAINT valid_tx_hash CHECK (transaction_hash ~ '^0x[a-fA-F0-9]{64}$'),
    CONSTRAINT valid_chain_id CHECK (chain_id > 0),
    CONSTRAINT valid_block_number CHECK (block_number > 0),
    CONSTRAINT valid_token_symbol CHECK (token_symbol ~ '^[A-Z0-9]{1,10}$')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_collections_owner ON collections(collection_owner);
CREATE INDEX IF NOT EXISTS idx_collections_chain_id ON collections(chain_id);
CREATE INDEX IF NOT EXISTS idx_collections_token_address ON collections(token_address);
CREATE INDEX IF NOT EXISTS idx_collections_tx_hash ON collections(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at);
CREATE INDEX IF NOT EXISTS idx_collections_token_symbol ON collections(token_symbol);
CREATE INDEX IF NOT EXISTS idx_collections_opensea_slug ON collections(opensea_slug);
-- Note: No index on collection_image BYTEA column as it can cause performance issues

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_unique_deployment 
ON collections(transaction_hash, chain_id);

-- Create a unique constraint to prevent duplicate token symbols (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_unique_symbol 
ON collections(UPPER(token_symbol));

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_collections_updated_at 
    BEFORE UPDATE ON collections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easy querying with chain information
CREATE OR REPLACE VIEW collections_with_chain_info AS
SELECT
    c.id,
    c.collection_name,
    c.collection_owner,
    c.chain_id,
    c.token_address,
    c.router_address,
    c.strategy_address,
    c.royalties_address,
    c.deployer_address,
    c.transaction_hash,
    c.block_number,
    c.token_symbol,
    c.collection_image,
    c.website,
    c.twitter,
    c.discord,
    c.telegram_id,
    c.opensea_slug,
    c.total_supply,
    c.listed_count,
    c.floor_price,
    c.market_cap,
    c.opensea_data_updated_at,
    c.created_at,
    c.updated_at,
    CASE c.chain_id
        WHEN 1 THEN 'Ethereum Mainnet'
        WHEN 11155111 THEN 'Ethereum Sepolia Testnet'
        WHEN 137 THEN 'Polygon Mainnet'
        WHEN 10 THEN 'Optimism Mainnet'
        WHEN 42161 THEN 'Arbitrum One'
        WHEN 8453 THEN 'Base Mainnet'
        WHEN 10143 THEN 'Monad Testnet'
        WHEN 33139 THEN 'Apechain Mainnet'
        ELSE 'Unknown Network'
    END as network_name,
    CASE c.chain_id
        WHEN 1 THEN 'https://etherscan.io'
        WHEN 11155111 THEN 'https://sepolia.etherscan.io'
        WHEN 137 THEN 'https://polygonscan.com'
        WHEN 10 THEN 'https://optimistic.etherscan.io'
        WHEN 42161 THEN 'https://arbiscan.io'
        WHEN 8453 THEN 'https://basescan.org'
        WHEN 10143 THEN 'https://testnet.monadexplorer.com'
        WHEN 33139 THEN 'https://apescan.io'
        ELSE NULL
    END as explorer_base_url
FROM collections c;

-- =====================================================
-- USEFUL QUERIES FOR PRODUCTION
-- =====================================================

-- Get all collections by owner:
-- SELECT * FROM collections_with_chain_info WHERE collection_owner = '0x...';

-- Get collections by chain:
-- SELECT * FROM collections_with_chain_info WHERE chain_id = 1;

-- Get recent deployments:
-- SELECT * FROM collections_with_chain_info ORDER BY created_at DESC LIMIT 10;

-- Get collections with social links:
-- SELECT * FROM collections_with_chain_info WHERE website IS NOT NULL OR twitter IS NOT NULL;

-- Check symbol availability:
-- SELECT * FROM collections_with_chain_info WHERE UPPER(token_symbol) = UPPER('BOP');

-- Get collections by symbol (case-insensitive):
-- SELECT * FROM collections_with_chain_info WHERE UPPER(token_symbol) = UPPER('BOP');

-- Get collections with OpenSea data:
-- SELECT * FROM collections_with_chain_info WHERE opensea_slug IS NOT NULL;

-- Get collections by network:
-- SELECT * FROM collections_with_chain_info WHERE network_name = 'Ethereum Mainnet';

-- =====================================================
-- PRODUCTION MONITORING QUERIES
-- =====================================================

-- Count collections by chain:
-- SELECT chain_id, network_name, COUNT(*) as collection_count 
-- FROM collections_with_chain_info 
-- GROUP BY chain_id, network_name 
-- ORDER BY collection_count DESC;

-- Get deployment statistics:
-- SELECT 
--     DATE(created_at) as deployment_date,
--     COUNT(*) as deployments,
--     COUNT(DISTINCT collection_owner) as unique_deployers
-- FROM collections 
-- GROUP BY DATE(created_at) 
-- ORDER BY deployment_date DESC;

-- Get most popular symbols:
-- SELECT 
--     UPPER(token_symbol) as symbol,
--     COUNT(*) as usage_count,
--     STRING_AGG(DISTINCT network_name, ', ') as networks
-- FROM collections_with_chain_info 
-- GROUP BY UPPER(token_symbol) 
-- HAVING COUNT(*) > 1
-- ORDER BY usage_count DESC;

-- =====================================================
-- MAINTENANCE QUERIES
-- =====================================================

-- Find duplicate symbols (should be empty after unique constraint):
-- SELECT 
--     UPPER(token_symbol) as symbol,
--     COUNT(*) as count,
--     STRING_AGG(id::text, ', ') as collection_ids
-- FROM collections 
-- GROUP BY UPPER(token_symbol) 
-- HAVING COUNT(*) > 1;

-- Find collections without images:
-- SELECT id, collection_name, token_symbol, created_at 
-- FROM collections 
-- WHERE collection_image IS NULL 
-- ORDER BY created_at DESC;

-- Find collections with invalid addresses:
-- SELECT id, collection_name, token_symbol, collection_owner, token_address
-- FROM collections 
-- WHERE collection_owner !~ '^0x[a-fA-F0-9]{40}$' 
--    OR token_address !~ '^0x[a-fA-F0-9]{40}$'
--    OR router_address !~ '^0x[a-fA-F0-9]{40}$'
--    OR strategy_address !~ '^0x[a-fA-F0-9]{40}$'
--    OR royalties_address !~ '^0x[a-fA-F0-9]{40}$'
--    OR deployer_address !~ '^0x[a-fA-F0-9]{40}$';

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Analyze tables for query optimization:
-- ANALYZE collections;

-- Update table statistics:
-- UPDATE pg_stat_user_tables SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0 WHERE relname = 'collections';

-- =====================================================
-- BACKUP AND RECOVERY
-- =====================================================

-- Create backup of collections table:
-- pg_dump -h localhost -U username -d database_name -t collections > collections_backup.sql

-- Restore from backup:
-- psql -h localhost -U username -d database_name < collections_backup.sql

-- =====================================================
-- SECURITY CONSIDERATIONS
-- =====================================================

-- Grant appropriate permissions (adjust as needed):
-- GRANT SELECT, INSERT, UPDATE ON collections TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE collections_id_seq TO your_app_user;
-- GRANT SELECT ON collections_with_chain_info TO your_app_user;

-- =====================================================
-- SCHEMA VERSION INFO
-- =====================================================

-- This schema includes:
-- ✅ Complete collections table with all fields
-- ✅ Unique constraint on token symbols (case-insensitive)
-- ✅ Unique constraint on deployment transactions
-- ✅ Proper indexes for performance
-- ✅ Automatic timestamp updates
-- ✅ Chain information view
-- ✅ Data validation constraints
-- ✅ Production monitoring queries
-- ✅ Maintenance and backup procedures

-- Schema Version: 1.0.0
-- Last Updated: 2024
-- Compatible with: BidBop v1.0+
