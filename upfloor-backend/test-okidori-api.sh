#!/bin/bash

# Test Okidori API Integration
# This script tests the Okidori marketplace API endpoints

set -e

echo " Testing Okidori API Integration"
echo "=================================="
echo ""

# Configuration
COLLECTION_OWNER="0x77d64eca9ede120280e9ffe19990f0caf4bb45da"
API_KEY="99d04c2b44ff0d0139731293ea992774bf30479fd63df14decd650ca5309303c"
BASE_URL="https://okidori.xyz/api/client-api"

echo " Test Configuration:"
echo "  Collection Owner: $COLLECTION_OWNER"
echo "  Base URL: $BASE_URL"
echo ""

# Test 1: Direct Okidori API call
echo "Test 1: Direct Okidori API Call"
echo "--------------------------------"
OKIDORI_URL="${BASE_URL}?direction=desc&sort=listing&page=1&limit=100&collection=${COLLECTION_OWNER}"
echo "URL: $OKIDORI_URL"
echo ""

echo "Making request..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "accept: application/json" \
  -H "x-api-key: $API_KEY" \
  "$OKIDORI_URL")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "Success! Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo " Failed! Response:"
  echo "$BODY"
fi

echo ""
echo "=================================="
echo ""

# Test 2: Local API - Stats endpoint
echo "Test 2: Local API - Stats Endpoint"
echo "-----------------------------------"
echo "URL: http://localhost:3000/api/okidori/stats/$COLLECTION_OWNER"
echo ""

if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "Making request..."
  curl -s "http://localhost:3000/api/okidori/stats/$COLLECTION_OWNER" | jq '.'
else
  echo " Local server not running. Start with: npm run dev"
fi

echo ""
echo "=================================="
echo ""

# Test 3: Local API - Sync endpoint
echo "Test 3: Local API - Sync Endpoint"
echo "----------------------------------"
echo "URL: http://localhost:3000/api/okidori/sync/$COLLECTION_OWNER"
echo ""

if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "Making request..."
  curl -s "http://localhost:3000/api/okidori/sync/$COLLECTION_OWNER" | jq '.'
else
  echo "Local server not running. Start with: npm run dev"
fi

echo ""
echo "=================================="
echo ""

# Test 4: Check database
echo "Test 4: Database Check"
echo "----------------------"
echo "Checking collection data in database..."
echo ""

PGPASSWORD='bidbop_dev_password' psql -h localhost -U bidbop_user -d bidbop -c \
  "SELECT 
    collection_name,
    token_symbol,
    collection_owner,
    total_supply,
    listed_count,
    floor_price,
    opensea_data_updated_at
  FROM collections 
  WHERE collection_owner = '$COLLECTION_OWNER';"

echo ""
echo "=================================="
echo " Tests Complete!"
echo ""
