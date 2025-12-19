import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contract: string }> }
) {
  try {
    const { contract } = await params;

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    const apiKey = 'f6142c9c-d468-44e8-8ef8-1911a74a5345';
    if (!apiKey) {
      console.error('MAGICEDEN_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Magic Eden API key not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 Fetching Magic Eden data for contract:', contract);

    // Fetch collection info (includes floor price)
    const collectionUrl = `https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet/collections/v7?id=${contract}&includeMintStages=false&includeSecurityConfigs=false&normalizeRoyalties=false&useNonFlaggedFloorAsk=false&sortBy=allTimeVolume&limit=1`;
    
    const collectionResponse = await fetch(collectionUrl, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'Authorization': apiKey,
      },
    });

    if (!collectionResponse.ok) {
      const errorText = await collectionResponse.text();
      console.error('Magic Eden collection API error:', errorText);
      return NextResponse.json(
        { error: `Failed to fetch collection data: ${collectionResponse.status}` },
        { status: collectionResponse.status }
      );
    }

    const collectionData = await collectionResponse.json();
    console.log('📊 Collection data received:', JSON.stringify(collectionData, null, 2));

    if (!collectionData.collections || collectionData.collections.length === 0) {
      return NextResponse.json(
        { error: 'No collection found for this contract' },
        { status: 404 }
      );
    }

    const collection = collectionData.collections[0];
    
    if (!collection.floorAsk) {
      return NextResponse.json(
        { error: 'No floor listing available for this collection' },
        { status: 404 }
      );
    }

    // Fetch detailed listing information
    const listingsUrl = `https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet/orders/asks/v5?contracts=${contract}&includeCriteriaMetadata=false&includeRawData=true&includeDynamicPricing=false&excludeEOA=false&normalizeRoyalties=false&sortBy=price&limit=1`;
    
    const listingsResponse = await fetch(listingsUrl, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'Authorization': apiKey,
      },
    });

    if (!listingsResponse.ok) {
      console.error('Magic Eden listings API error');
      return NextResponse.json(
        { error: `Failed to fetch listings: ${listingsResponse.status}` },
        { status: listingsResponse.status }
      );
    }

    const listingsData = await listingsResponse.json();
    console.log('📋 Listings data received:', JSON.stringify(listingsData, null, 2));

    if (!listingsData.orders || listingsData.orders.length === 0) {
      return NextResponse.json(
        { error: 'No active listings found' },
        { status: 404 }
      );
    }

    const floorOrder = listingsData.orders[0];
    
    // Format the response
    const floorListing = {
      orderId: floorOrder.id,
      tokenId: floorOrder.criteria?.data?.token?.tokenId || '',
      contract: floorOrder.contract,
      price: floorOrder.price.amount.raw,
      priceDecimal: floorOrder.price.amount.decimal,
      currency: floorOrder.price.currency.symbol,
      maker: floorOrder.maker,
      validUntil: floorOrder.validUntil,
      source: floorOrder.source?.name || 'Magic Eden',
      rawData: floorOrder.rawData,
      kind: floorOrder.kind,
    };

    // Calculate market cap (supply * floor price)
    const supply = parseInt(collection.supply || collection.tokenCount || '0');
    const floorPrice = parseFloat(collection.floorAsk.price.amount.decimal);
    const marketCap = supply * floorPrice;

    return NextResponse.json({
      success: true,
      listing: floorListing,
      collection: {
        name: collection.name,
        image: collection.image,
        floorPrice: collection.floorAsk.price.amount.decimal,
        floorPriceRaw: collection.floorAsk.price.amount.raw,
        supply: supply,
        onSaleCount: parseInt(collection.onSaleCount || '0'),
        marketCap: marketCap.toString(),
        ownerCount: collection.ownerCount,
      }
    });

  } catch (error: any) {
    console.error('❌ Error in Magic Eden floor price API:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

