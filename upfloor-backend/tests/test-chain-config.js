// Test script to verify getChainConfig function
import { getChainConfig } from './lib/chainlist.js';

console.log('Testing getChainConfig function:');
console.log('');

// Test Taiko chain (167000)
const taikoConfig = getChainConfig(167000);
console.log('Taiko (167000):', taikoConfig);
console.log('Taiko currency:', taikoConfig?.currency);
console.log('');

// Test other chains
const ethereumConfig = getChainConfig(1);
console.log('Ethereum (1):', ethereumConfig);
console.log('Ethereum currency:', ethereumConfig?.currency);
console.log('');

const monadConfig = getChainConfig(10143);
console.log('Monad (10143):', monadConfig);
console.log('Monad currency:', monadConfig?.currency);
console.log('');

const apechainConfig = getChainConfig(33139);
console.log('Apechain (33139):', apechainConfig);
console.log('Apechain currency:', apechainConfig?.currency);