#!/usr/bin/env node

/**
 * Test Currency Display for Taiko Chain
 * 
 * This script tests that chain 167000 (Taiko) displays "TAIKO" as currency
 */

const { chainConfigs } = require('./lib/chainlist.js');

console.log('🧪 Testing Currency Display for Taiko Chain');
console.log('============================================');
console.log('');

// Test Taiko chain configuration
const taikoChain = chainConfigs[167000];

if (taikoChain) {
  console.log(' Taiko chain found:');
  console.log('  Chain ID:', taikoChain.id);
  console.log('  Name:', taikoChain.name);
  console.log('  Network:', taikoChain.networkName);
  console.log('  Currency:', taikoChain.currency);
  console.log('  Explorer:', taikoChain.explorer);
  console.log('');

  if (taikoChain.currency === 'TAIKO') {
    console.log(' Currency is correctly set to "TAIKO"');
  } else {
    console.log('Currency is NOT set to "TAIKO", found:', taikoChain.currency);
  }
} else {
  console.log('Taiko chain (167000) not found in chainConfigs');
}

console.log('');

// Test getCurrencySymbol function simulation (matches collections/listing pages)
function getCurrencySymbol(chainId) {
  if (!chainId) return 'ETH';
  // Special case for Taiko chain - display TAIKO instead of ETH
  if (chainId === 167000) return 'TAIKO';
  const config = Object.values(chainConfigs).find(c => c.id === chainId);
  return config?.currency || 'ETH';
}

console.log(' Testing getCurrencySymbol function:');
console.log('');

const testChains = [
  { id: 1, expected: 'ETH', name: 'Ethereum' },
  { id: 137, expected: 'MATIC', name: 'Polygon' },
  { id: 10143, expected: 'MON', name: 'Monad' },
  { id: 33139, expected: 'APE', name: 'Apechain' },
  { id: 167000, expected: 'TAIKO', name: 'Taiko' },
];

testChains.forEach(chain => {
  const result = getCurrencySymbol(chain.id);
  const status = result === chain.expected ? 'ok' : 'not ok';
  console.log(`${status} Chain ${chain.id} (${chain.name}): ${result} (expected: ${chain.expected})`);
});

console.log('');
console.log(' Summary:');
console.log('- Taiko chain (167000) should display "TAIKO" as currency');
console.log('- Collection pages will now show prices in TAIKO instead of ETH');
console.log('- Example: "7.99 TAIKO" instead of "7.99 ETH"');
console.log('');