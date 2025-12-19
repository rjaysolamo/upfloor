import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderHash, chain, protocolAddress, fulfillerAddress } = body;

    if (!orderHash || !chain || !fulfillerAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: orderHash, chain, fulfillerAddress' },
        { status: 400 }
      );
    }

    const OPENSEA_API_KEY = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || 'b356a19f92d745489960e6336768677c';
    const OPENSEA_BASE = 'https://api.opensea.io/api/v2';
    const fulfillmentUrl = `${OPENSEA_BASE}/listings/fulfillment_data`;

    const fulfillmentBody = {
      listing: {
        hash: orderHash,
        chain: chain,
        protocol_address: protocolAddress || '0x0000000000000068F116a894984e2DB1123eB395'
      },
      fulfiller: {
        address: fulfillerAddress
      }
    };

    console.log('🔨 Generating fulfillment data for order:', orderHash);
    console.log('📦 Request body:', JSON.stringify(fulfillmentBody, null, 2));

    const response = await fetch(fulfillmentUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-key': OPENSEA_API_KEY,
      },
      body: JSON.stringify(fulfillmentBody),
    });

    console.log('📊 Fulfillment Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Fulfillment API Error:', errorText);
      return NextResponse.json(
        { error: `Failed to generate fulfillment data: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('✅ Fulfillment data generated successfully');

    return NextResponse.json({
      success: true,
      fulfillmentData: data.fulfillment_data,
    });

  } catch (error: any) {
    console.error('💥 Error generating fulfillment data:', error);
    return NextResponse.json(
      { error: 'Failed to generate fulfillment data', details: error.message },
      { status: 500 }
    );
  }
}

