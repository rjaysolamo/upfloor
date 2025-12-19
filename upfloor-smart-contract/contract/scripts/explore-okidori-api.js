const axios = require("axios");

const OKIDORI_API_KEY = "99d04c2b44ff0d0139731293ea992774bf30479fd63df14decd650ca5309303c";
const OKIDORI_BASE_URL = "https://okidori.xyz/api/client-api";

async function exploreAPI() {
  try {
    console.log("🔍 Exploring Okidori API...");
    
    // Test the exact same call as the working curl command
    const testCollection = "0x77d64eca9ede120280e9ffe19990f0caf4bb45da";
    const url = `${OKIDORI_BASE_URL}?direction=desc&sort=listing&page=1&limit=100&collection=${testCollection}`;
    
    console.log("Testing URL:", url);
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'x-api-key': OKIDORI_API_KEY
        }
      });
      
      console.log("✅ Response status:", response.status);
      console.log("Response data keys:", Object.keys(response.data || {}));
      console.log("Full response:", JSON.stringify(response.data, null, 2));
      
      return response.data;
      
    } catch (error) {
      console.log("❌ Error:", error.message);
      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Headers:", error.response.headers);
        console.log("Data:", error.response.data);
      }
      return null;
    }
    
  } catch (error) {
    console.error("❌ API exploration failed:", error.message);
    return null;
  }
}

async function main() {
  const workingCollection = await exploreAPI();
  
  if (workingCollection) {
    console.log(`\n✅ Found working collection: ${workingCollection}`);
  } else {
    console.log("\n❌ No collections with listings found");
  }
}

main().catch(console.error);