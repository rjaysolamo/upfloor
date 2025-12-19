import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Collection slug is required' },
        { status: 400 }
      );
    }

    const OPENSEA_API_KEY = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || 'b356a19f92d745489960e6336768677c';
    const OPENSEA_BASE = 'https://api.opensea.io/api/v2';
    const listingsUrl = `${OPENSEA_BASE}/listings/collection/${slug}/all?limit=10`;

    console.log('🔍 Fetching floor price for:', slug);
    console.log('📡 OpenSea API URL:', listingsUrl);

    const response = await fetch(listingsUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-api-key': OPENSEA_API_KEY,
      },
      // Add cache control
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    console.log('📊 OpenSea Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenSea API Error:', errorText);
      return NextResponse.json(
        { error: `OpenSea API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const listings = data.listings || [];

    console.log(`✅ Found ${listings.length} listings for ${slug}`);

    if (listings.length === 0) {
      return NextResponse.json(
        { error: 'No active listings found', listings: [] },
        { status: 404 }
      );
    }

    // Filter valid (non-expired) listings
    const now = Math.floor(Date.now() / 1000);
    const validListings = listings
      .filter((listing: any) => {
        const endTime = Number(listing.protocol_data.parameters.endTime);
        return endTime > now;
      })
      .map((listing: any) => {
        const offerItem = listing.protocol_data.parameters.offer[0];
        return {
          orderHash: listing.order_hash,
          chain: listing.chain,
          protocolAddress: listing.protocol_address,
          protocolData: listing.protocol_data,
          nftContractAddress: offerItem.token,
          tokenId: offerItem.identifierOrCriteria,
          price: listing.price.current.value,
          currency: listing.price.current.currency,
          decimals: listing.price.current.decimals,
          type: listing.type,
          endTime: listing.protocol_data.parameters.endTime,
        };
      });

    console.log(`🎯 Valid listings: ${validListings.length}`);

    if (validListings.length === 0) {
      return NextResponse.json(
        { error: 'No valid (non-expired) listings found', listings: [] },
        { status: 404 }
      );
    }

    // Sort by price (ascending) and return cheapest
    validListings.sort((a: any, b: any) => {
      const priceA = BigInt(a.price);
      const priceB = BigInt(b.price);
      return priceA > priceB ? 1 : priceA < priceB ? -1 : 0;
    });

    const floorListing = validListings[0];

    console.log('💎 Floor listing:', {
      tokenId: floorListing.tokenId,
      price: floorListing.price,
      currency: floorListing.currency,
    });

    return NextResponse.json({
      success: true,
      listing: floorListing,
      totalListings: listings.length,
      validListings: validListings.length,
    });

  } catch (error: any) {
    console.error('💥 Error fetching floor price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch floor price', details: error.message },
      { status: 500 }
    );
  }
}

