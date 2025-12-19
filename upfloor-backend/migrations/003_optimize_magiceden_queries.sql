-- =====================================================
-- Migration: Optimize Magic Eden data queries
-- Purpose: Add composite index for faster cache lookups
-- =====================================================

-- Add composite index for Magic Eden sync queries
-- This speeds up queries that filter by collection_owner, chain_id, and opensea_data_updated_at
CREATE INDEX IF NOT EXISTS idx_collections_magiceden_cache 
ON collections(collection_owner, chain_id, opensea_data_updated_at DESC)
WHERE chain_id = 10143;

-- Add index on opensea_data_updated_at for age checks
CREATE INDEX IF NOT EXISTS idx_collections_data_freshness
ON collections(opensea_data_updated_at DESC)
WHERE opensea_data_updated_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_collections_magiceden_cache IS 
'Optimizes Magic Eden data cache lookups by collection_owner and chain_id';

COMMENT ON INDEX idx_collections_data_freshness IS 
'Speeds up queries checking data freshness across all collections';

-- Analyze table to update query planner statistics
ANALYZE collections;

-- =====================================================
-- Performance Impact:
-- Before: Full table scan (~100-1000ms for large datasets)
-- After: Index scan (~1-10ms)
-- Expected speedup: 10-100x faster queries
-- =====================================================

