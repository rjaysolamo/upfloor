const { ethers } = require("hardhat");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Taiko Configuration
const TAIKO_MARKETPLACE = "0x89aFa165F40f2210c99e87E706C0160503E12F1c";
const NFT_COLLECTION = "0x77d64eca9ede120280e9ffe19990f0caf4bb45da";
const TOKEN_ID = 8487;

// Okidori API Configuration
const OKIDORI_API = "https://okidori.xyz/api/client-api";
const API_KEY = "99d04c2b44ff0d0139731293ea992774bf30479fd63df14decd650ca5309303c";

async function main() {
    console.log("\n🔍 Checking Taiko Marketplace Listing...\n");

    const [signer] = await ethers.getSigners();
    console.log("Checking with account:", signer.address);

    console.log("\n📋 NFT Information:");
    console.log("  Collection:", NFT_COLLECTION);
    console.log("  Token ID:", TOKEN_ID);

    // Check NFT owner
    const nftABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
    const nftContract = new ethers.Contract(NFT_COLLECTION, nftABI, signer);
    try {
        const owner = await nftContract.ownerOf(TOKEN_ID);
        console.log("  Current Owner:", owner);
    } catch (error) {
        console.log("  ❌ Could not get NFT owner:", error.message);
    }

    // Fetch listings from Okidori API
    console.log("\n📡 Fetching listings from Okidori API...");
    
    try {
        const url = `${OKIDORI_API}?direction=desc&sort=listing&page=1&limit=100&collection=${NFT_COLLECTION}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log(`  ✅ Found ${data.listings?.length || 0} listings for this collection`);

        // Find listing for our specific token ID
        const listing = data.listings?.find(l => 
            l.tokenId === TOKEN_ID.toString() || 
            parseInt(l.tokenId) === TOKEN_ID
        );

        if (listing) {
            console.log("\n🎯 Found listing for Token ID", TOKEN_ID);
            console.log("═══════════════════════════════════════════════════");
            console.log("Listing ID:       ", listing.listingId || listing.id);
            console.log("Token ID:         ", listing.tokenId);
            console.log("Price:            ", listing.price ? ethers.formatEther(listing.price) : "N/A", "TAIKO");
            console.log("Seller:           ", listing.seller || listing.owner);
            console.log("Payment Token:    ", listing.paymentToken);
            console.log("Status:           ", listing.status || "Active");
            console.log("═══════════════════════════════════════════════════");

            // Save listing ID to env for easy use
            console.log("\n💡 To buy this NFT, use:");
            console.log(`LISTING_ID=${listing.listingId || listing.id} npx hardhat run scripts/buy-nft-taiko.js --network taikoalethia`);
            
        } else {
            console.log("\n⚠️  No listing found for Token ID", TOKEN_ID);
            console.log("\nAll listings for this collection:");
            
            if (data.listings && data.listings.length > 0) {
                data.listings.slice(0, 10).forEach((l, i) => {
                    console.log(`\n${i + 1}. Token ID: ${l.tokenId}`);
                    console.log(`   Listing ID: ${l.listingId || l.id}`);
                    console.log(`   Price: ${l.price ? ethers.formatEther(l.price) : "N/A"} TAIKO`);
                });
                
                if (data.listings.length > 10) {
                    console.log(`\n... and ${data.listings.length - 10} more listings`);
                }
            }
        }

    } catch (error) {
        console.error("\n❌ Error fetching listings from API:");
        console.error(error.message);
        
        console.log("\n💡 Manual check:");
        console.log("1. Go to: https://okidori.xyz");
        console.log("2. Search for collection:", NFT_COLLECTION);
        console.log("3. Find Token ID:", TOKEN_ID);
    }
    
    console.log("\n🔗 Marketplace Contract:");
    console.log("https://taikoscan.io/address/" + TAIKO_MARKETPLACE);
    
    console.log("\n🔗 NFT on Taikoscan:");
    console.log(`https://taikoscan.io/token/${NFT_COLLECTION}?a=${TOKEN_ID}`);
    
    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
