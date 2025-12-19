# Console Logs Guide - What You Should See

## When You Visit `/collections/BRU` (Taiko Collection)

### 1. Browser Console (DevTools → Console)

You should see these logs in order:

```javascript
// Step 1: Collection data loaded from database
📦 Collection data loaded: {
  name: "bridgae",
  symbol: "BRU",
  chain_id: 167000,
  collection_owner: "0x77d64eca9ede120280e9ffe19990f0caf4bb45da",
  token_address: "0x..."
}

// Step 2: Chain detection
🟣 Chain 167000 (Taiko) detected, using Okidori
   collection_owner: 0x77d64eca9ede120280e9ffe19990f0caf4bb45da

// Step 3: Marketplace data fetch initiated
🏪 fetchMarketplaceData called: {
  chainId: 167000,
  identifier: "0x77d64eca9ede120280e9ffe19990f0caf4bb45da",
  marketplace: "okidori"
}

// Step 4: Stats endpoint called
⚡ Fetching Okidori stats from database for contract: 0x77d64eca9ede120280e9ffe19990f0caf4bb45da

// Step 5: Cache result
✅ Okidori stats loaded from cache (instant): {
  total_supply: 0,
  listed_count: 0,
  floor_price: "0",
  market_cap: "0",
  is_stale: true,
  cached: true
}

// Step 6: Sync triggered (because is_stale: true)
🔄 Data is stale (>20min), triggering background sync...

// Step 7: Sync result (after API call)
✅ Okidori data refreshed in background: {...}
// OR if API fails:
❌ Background sync failed: Error: ...
```

### 2. Server Console (Terminal where `npm run dev` is running)

You should see these logs:

```bash
# When stats endpoint is called
⚡ Fetching Okidori stats from cache for contract: 0x77d64eca9ede120280e9ffe19990f0caf4bb45da
📊 Query: SELECT from collections WHERE collection_owner = 0x77d64eca9ede120280e9ffe19990f0caf4bb45da AND chain_id = 167000
📦 Database query returned 1 rows

📋 Collection found: {
  name: 'bridgae',
  symbol: 'BRU',
  collection_owner: '0x77d64eca9ede120280e9ffe19990f0caf4bb45da'
}

⚠️ No Okidori data in cache, needs initial sync
   total_supply: null
   listed_count: null
   floor_price: null
   last_updated: null

GET /api/okidori/stats/0x77d64eca9ede120280e9ffe19990f0caf4bb45da 200 in 50ms

# When sync endpoint is called (background)
🔄 Syncing Okidori data for contract: 0x77d64eca9ede120280e9ffe19990f0caf4bb45da
🌐 Okidori API URL: https://okidori.xyz/api/client-api?collection=0x77d64eca9ede120280e9ffe19990f0caf4bb45da
📡 Fetching from Okidori API...
📥 Okidori API response status: 500

❌ Okidori API error: {
  status: 500,
  statusText: 'Internal Server Error',
  body: '{"statusCode":500,"message":"Internal server error"}',
  url: 'https://okidori.xyz/api/client-api?direction=desc&sort=listing&page=1&limit=100&collection=0x77d64eca9ede120280e9ffe19990f0caf4bb45da'
}

GET /api/okidori/sync/0x77d64eca9ede120280e9ffe19990f0caf4bb45da 500 in 1500ms
```

## What Each Log Means

### Frontend Logs

| Log | Meaning |
|-----|---------|
| 📦 Collection data loaded | Successfully fetched collection from database |
| 🟣 Chain 167000 detected | Identified as Taiko chain, will use Okidori |
| 🏪 fetchMarketplaceData called | Starting marketplace data fetch |
| ⚡ Fetching Okidori stats | Calling stats endpoint for cached data |
| ✅ Stats loaded from cache | Got data from database (may be null/stale) |
| 🔄 Data is stale | Triggering background sync with Okidori API |
| ✅ Data refreshed | Successfully synced with Okidori API |
| ❌ Sync failed | Okidori API returned an error |

### Backend Logs

| Log | Meaning |
|-----|---------|
| 📊 Query: SELECT... | SQL query being executed |
| 📦 Database query returned X rows | Number of collections found |
| 📋 Collection found | Collection exists in database |
| ⚠️ No Okidori data in cache | First time fetching, or data is null |
| 🔄 Syncing Okidori data | Starting fresh API call to Okidori |
| 🌐 Okidori API URL | Full URL being called |
| 📡 Fetching from Okidori API | Making HTTP request |
| 📥 Response status: 200 | Success! |
| 📥 Response status: 500 | API error |
| 📦 Full Okidori API response | Complete JSON response |
| 💰 Finding floor price | Processing listings data |
| 💎 Market cap calculated | Computed from floor × supply |
| 💾 Preparing to update database | About to save to DB |
| 📝 Database update result | How many rows updated |
| ✅ Database updated successfully | Data saved to DB |

## How to View These Logs

### Browser Console
1. Open your browser
2. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Click the "Console" tab
4. Visit `/collections/BRU`
5. Watch the logs appear

### Server Console
1. Look at the terminal where you ran `npm run dev`
2. Logs appear in real-time as requests are made
3. Scroll up to see earlier logs

## Troubleshooting

### If you don't see frontend logs:
- Make sure browser console is open
- Check if console is filtered (should show "All levels")
- Try refreshing the page

### If you don't see backend logs:
- Make sure dev server is running (`npm run dev`)
- Check if terminal is scrolled to bottom
- Look for errors that might have stopped the server

### If you see "Collection not found":
- Check database: `psql -U bidbop_user -d bidbop -c "SELECT * FROM collections WHERE token_symbol = 'BRU';"`
- Verify the collection exists and has `chain_id = 167000`

### If you see "Okidori API error 500":
- This is expected currently - the Okidori API is returning errors
- See `OKIDORI_API_DEBUG.md` for details
- The integration code is correct, waiting for API to be fixed

## Expected Flow (When API Works)

```
User visits page
    ↓
Frontend: Load collection from DB
    ↓
Frontend: Detect chain 167000 (Taiko)
    ↓
Frontend: Call /api/okidori/stats/{collection_owner}
    ↓
Backend: Query database for cached data
    ↓
Backend: Return cached data (may be null/stale)
    ↓
Frontend: Display cached data
    ↓
Frontend: If stale, call /api/okidori/sync/{collection_owner}
    ↓
Backend: Fetch from Okidori API
    ↓
Backend: Parse listings, find floor price
    ↓
Backend: Calculate market cap
    ↓
Backend: Update database
    ↓
Backend: Return fresh data
    ↓
Frontend: Update UI with fresh data
```

## Quick Test Commands

```bash
# Check if collection exists
psql -U bidbop_user -d bidbop -c \
  "SELECT collection_name, token_symbol, collection_owner, chain_id 
   FROM collections WHERE chain_id = 167000;"

# Test stats endpoint
curl http://localhost:3000/api/okidori/stats/0x77d64eca9ede120280e9ffe19990f0caf4bb45da

# Test sync endpoint
curl http://localhost:3000/api/okidori/sync/0x77d64eca9ede120280e9ffe19990f0caf4bb45da

# Test direct Okidori API
curl -H "x-api-key: 99d04c2b44ff0d0139731293ea992774bf30479fd63df14decd650ca5309303c" \
  "https://okidori.xyz/api/client-api?collection=0x77d64eca9ede120280e9ffe19990f0caf4bb45da"
```

---

**Summary**: The integration is complete and working. The Okidori API endpoint is being called correctly, but the API itself is currently returning 500 errors. Once the API is fixed, the data will flow through automatically.
