import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contract, tokenId, taker } = body;

    if (!contract || !tokenId || !taker) {
      return NextResponse.json(
        { error: 'Contract, tokenId, and taker address are required' },
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

    console.log('🔨 Preparing Magic Eden buy transaction:', { contract, tokenId, taker });

    // Step 1: Get the specific order for this token
    const ordersUrl = `https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet/orders/asks/v5?contracts=${contract}&tokenIds=${tokenId}&includeCriteriaMetadata=false&includeRawData=true&includeDynamicPricing=false&excludeEOA=false&normalizeRoyalties=false&sortBy=price&limit=1`;
    
    const ordersResponse = await fetch(ordersUrl, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'Authorization': apiKey,
      },
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('Failed to fetch order:', errorText);
      return NextResponse.json(
        { error: `Failed to fetch order: ${ordersResponse.status}` },
        { status: ordersResponse.status }
      );
    }

    const ordersData = await ordersResponse.json();
    
    if (!ordersData.orders || ordersData.orders.length === 0) {
      return NextResponse.json(
        { error: 'No active order found for this token' },
        { status: 404 }
      );
    }

    const order = ordersData.orders[0];
    
    // Step 2: Execute the buy on Magic Eden's API
    // Build the token identifier: contract:tokenId
    const token = `${contract}:${tokenId}`;
    
    // Call Magic Eden's execute/buy endpoint
    const executeUrl = 'https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet/execute/buy/v7';
    
    const executeBody = {
      items: [
        {
          token: token,
          quantity: 1,
          fillType: 'trade',
        }
      ],
      taker: taker,
      source: 'bidbop.io',
      skipBalanceCheck: true,
      onlyPath: false,
      normalizeRoyalties: false,
      allowInactiveOrderIds: false,
      preferredOrderSource: 'magiceden.io',
      partial: false,
      excludeEOA: false,
    };

    console.log('📤 Sending execute request:', JSON.stringify(executeBody, null, 2));

    const executeResponse = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify(executeBody),
    });

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      console.error('Failed to execute buy:', errorText);
      return NextResponse.json(
        { error: `Failed to execute buy: ${executeResponse.status}`, details: errorText },
        { status: executeResponse.status }
      );
    }

    const executeData = await executeResponse.json();
    console.log('✅ Execute response:', JSON.stringify(executeData, null, 2));

    // Extract transaction steps
    if (!executeData.steps || executeData.steps.length === 0) {
      return NextResponse.json(
        { error: 'No transaction steps returned from Magic Eden' },
        { status: 500 }
      );
    }

    // Find the main transaction step (usually the last one with kind 'transaction')
    const txSteps = executeData.steps.filter((step: any) => 
      step.items && step.items.length > 0 && step.items[0].data
    );

    if (txSteps.length === 0) {
      return NextResponse.json(
        { error: 'No valid transaction data found' },
        { status: 500 }
      );
    }

    // Get the transaction data
    const transactions = txSteps.map((step: any) => {
      const item = step.items[0];
      return {
        to: item.data.to,
        data: item.data.data,
        value: item.data.value || '0',
        from: item.data.from,
      };
    });

    return NextResponse.json({
      success: true,
      transactions: transactions,
      path: executeData.path,
      price: order.price.amount.raw,
      priceDecimal: order.price.amount.decimal,
      currency: order.price.currency.symbol,
    });

  } catch (error: any) {
    console.error('❌ Error in Magic Eden buy API:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

