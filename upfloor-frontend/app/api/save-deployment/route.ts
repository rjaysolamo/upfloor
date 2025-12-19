import { NextRequest, NextResponse } from "next/server";
import { saveCollection, CollectionData } from "@/lib/database/collections";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      // Deployment data from transaction parsing
      deployer,
      token,
      router,
      strategy,
      name,
      symbol,
      txHash,
      chainId,
      blockNumber,

      // Form data
      collectionOwner,
      royaltiesAddress,
      royaltyPercentage,
      website,
      twitter,
      discord,
      telegramId,
      openseaSlug,
      image,
    } = body;

    // Validate required fields
    if (!deployer || !token || !router || !strategy || !name || !symbol || !txHash || !chainId || !blockNumber) {
      return NextResponse.json(
        { error: "Missing required deployment data" },
        { status: 400 }
      );
    }

    if (!collectionOwner || !royaltiesAddress || royaltyPercentage === undefined) {
      return NextResponse.json(
        { error: "Missing required form data: collectionOwner, royaltiesAddress, and royaltyPercentage" },
        { status: 400 }
      );
    }

    // Validate image if provided
    if (image) {
      // Check if it's a valid base64 data URL
      const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
      if (!base64Regex.test(image)) {
        return NextResponse.json(
          { error: "Invalid image format. Only JPEG, PNG, GIF, and WebP are supported." },
          { status: 400 }
        );
      }

      // Check image size (500KB limit)
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const maxSize = 500 * 1024; // 500KB

      if (buffer.length > maxSize) {
        return NextResponse.json(
          { 
            error: `Image size exceeds 500KB limit. Current size: ${Math.round(buffer.length / 1024)}KB` 
          },
          { status: 400 }
        );
      }
    }

    // Prepare collection data
    const collectionData: CollectionData = {
      collection_name: name,
      collection_owner: collectionOwner,
      chain_id: parseInt(chainId),
      token_address: token,
      router_address: router,
      strategy_address: strategy,
      royalties_address: royaltiesAddress,
      deployer_address: deployer,
      transaction_hash: txHash,
      block_number: parseInt(blockNumber),
      token_symbol: symbol,
      royalty_percentage: parseFloat(royaltyPercentage),
      collection_image: image || undefined,
      website: website || undefined,
      twitter: twitter || undefined,
      discord: discord || undefined,
      telegram_id: telegramId || undefined,
      opensea_slug: openseaSlug || undefined,
    };

    // Save to database
    const savedCollection = await saveCollection(collectionData);

    return NextResponse.json({
      success: true,
      collection: savedCollection,
    });
  } catch (error) {
    console.error("Error saving deployment:", error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes("duplicate key")) {
        // Check if it's a symbol conflict or transaction conflict
        if (error.message.includes("idx_collections_unique_symbol")) {
          return NextResponse.json(
            { error: "Token symbol already exists. Please choose a different symbol." },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { error: "Collection already exists for this transaction" },
            { status: 409 }
          );
        }
      }
      
      // Handle image validation errors
      if (error.message.includes("Invalid image format") || 
          error.message.includes("Image size exceeds") ||
          error.message.includes("Invalid base64 format")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to save deployment data" },
      { status: 500 }
    );
  }
}
