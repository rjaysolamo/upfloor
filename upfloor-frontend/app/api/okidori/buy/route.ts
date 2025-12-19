import { NextRequest, NextResponse } from 'next/server';

/**
 * Okidori Marketplace Buy API
 * 
 * This endpoint prepares the transaction data needed to purchase an NFT from Okidori marketplace on Taiko.
 * 
 * IMPORTANT NOTES:
 * - All prices are in wei (18 decimals) representing TAIKO token
 * - Example: 3000000000000000000 = 3.0 TAIKO
 * - The marketplace uses TAIKO token as the payment currency
 * 
 * CONTRACTS:
 * - Marketplace (Proxy): 0x89aFa165F40f2210c99e87E706C0160503E12F1c
 * - Implementation: 0xb2effc7b5d7a0f4113916ba838502d529e7e47b8
 * - Payment Token (TAIKO): 0xA9d23408b9bA935c230493c40C73824Df71A0975
 * 
 * BUYING FLOW:
 * 1. Check buyer's TAIKO token allowance for marketplace
 * 2. If allowance < price, approve marketplace to spend TAIKO
 * 3. Call buyNFT(listingId) on marketplace contract
 */

const OKIDORI_API_KEY = '99d04c2b44ff0d0139731293ea992774bf30479fd63df14decd650ca5309303c';
const OKIDORI_BASE_URL = 'https://okidori.xyz/api/client-api';

// Okidori Marketplace Contract (Proxy)
const MARKETPLACE_ADDRESS = '0x89aFa165F40f2210c99e87E706C0160503E12F1c';

// Taiko Token (Payment Token)
const PAYMENT_TOKEN_ADDRESS = '0xA9d23408b9bA935c230493c40C73824Df71A0975';

// ABI for the marketplace contract (from implementation at 0xb2effc7b5d7a0f4113916ba838502d529e7e47b8)
const MARKETPLACE_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "listingId", "type": "uint256"}],
    "name": "buyNFT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ABI for ERC-20 token (approve and allowance)
const PAYMENT_TOKEN_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contract, tokenId, buyer } = body;

    if (!contract || !tokenId || !buyer) {
      return NextResponse.json(
        { error: 'Contract address, tokenId, and buyer address are required' },
        { status: 400 }
      );
    }

    console.log('🔨 Preparing Okidori buy transaction:', { contract, tokenId, buyer });

    // Step 1: Fetch listing data from Okidori API to get listingId and price
    const url = `${OKIDORI_BASE_URL}?direction=desc&sort=listing&page=1&limit=100&collection=${contract}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': OKIDORI_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch listings:', errorText);
      return NextResponse.json(
        { error: `Failed to fetch listings: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json(
        { error: 'No listings found for this collection' },
        { status: 404 }
      );
    }

    // Find the specific listing for this tokenId
    const listing = data.data.find((l: any) => l.nft?.tokenId === tokenId.toString());

    if (!listing) {
      return NextResponse.json(
        { error: `No active listing found for token ${tokenId}` },
        { status: 404 }
      );
    }

    // IMPORTANT: Use listingIdOnChain (on-chain ID) for buyNFT, not database ID
    // listing.id is the database ID, listing.listingIdOnChain is the on-chain listing ID
    const listingId = listing.listingIdOnChain || listing.id;
    const sellPrice = listing.sellPrice;

    if (!listingId || !sellPrice) {
      return NextResponse.json(
        { error: 'Invalid listing data: missing listingId or price' },
        { status: 500 }
      );
    }

    console.log('📋 Found listing:', {
      listingId,
      listingIdOnChain: listing.listingIdOnChain,
      databaseId: listing.id,
      sellPrice,
      tokenId,
      seller: listing.sellerWallet
    });

    // Warn if we're using database ID instead of on-chain ID
    if (!listing.listingIdOnChain && listing.id) {
      console.warn('⚠️ WARNING: Using database ID instead of listingIdOnChain. This may cause the buy transaction to fail!');
    }

    // Step 2: Prepare transaction steps
    // The buyer needs to:
    // 1. Check allowance
    // 2. Approve if needed
    // 3. Call buyNFT

    const transactions = [];

    // Transaction 1: Check allowance (read-only, frontend will handle)
    // Transaction 2: Approve token spending (if needed)
    transactions.push({
      type: 'approve',
      to: PAYMENT_TOKEN_ADDRESS,
      data: null, // Frontend will encode this based on current allowance
      value: '0',
      description: 'Approve Taiko Token spending',
      abi: PAYMENT_TOKEN_ABI,
      functionName: 'approve',
      args: [MARKETPLACE_ADDRESS, sellPrice],
      checkAllowance: {
        abi: PAYMENT_TOKEN_ABI,
        functionName: 'allowance',
        args: [buyer, MARKETPLACE_ADDRESS],
        requiredAmount: sellPrice
      }
    });

    // Transaction 3: Buy NFT
    transactions.push({
      type: 'buy',
      to: MARKETPLACE_ADDRESS,
      data: null, // Frontend will encode this
      value: '0',
      description: 'Purchase NFT',
      abi: MARKETPLACE_ABI,
      functionName: 'buyNFT',
      args: [listingId]
    });

    // Calculate price in TAIKO (from wei)
    const priceInTaiko = (Number(sellPrice) / 1e18).toFixed(6);

    return NextResponse.json({
      success: true,
      listingId: listingId, // On-chain listing ID for buyNFT (prioritizes listingIdOnChain)
      listingIdOnChain: listing.listingIdOnChain || listingId, // Explicitly return on-chain ID
      tokenId: tokenId,
      contract: contract,
      seller: listing.sellerWallet,
      price: sellPrice, // Raw price in wei (18 decimals)
      priceDecimal: priceInTaiko, // Human-readable price in TAIKO
      currency: 'TAIKO',
      transactions: transactions,
      contracts: {
        marketplace: MARKETPLACE_ADDRESS,
        paymentToken: PAYMENT_TOKEN_ADDRESS,
        nft: contract
      },
      instructions: {
        step1: 'Check current allowance for TAIKO token',
        step2: 'Approve marketplace to spend TAIKO if allowance is insufficient',
        step3: 'Call buyNFT function with listingIdOnChain'
      }
    });

  } catch (error: any) {
    console.error('❌ Error in Okidori buy API:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
