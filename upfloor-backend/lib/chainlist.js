// Chain configuration for different blockchains
export const chainConfigs = {
  // Ethereum Mainnet
  1: {
    id: 1,
    name: "Ethereum",
    networkName: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
    currency: "ETH",
    testnet: false
  },

  // Ethereum Sepolia Testnet
  11155111: {
    id: 11155111,
    name: "Sepolia",
    networkName: "Ethereum Sepolia Testnet",
    rpcUrl: "https://sepolia.infura.io/v3/",
    explorer: "https://sepolia.etherscan.io",
    currency: "ETH",
    testnet: true
  },


  // Optimism Mainnet
  10: {
    id: 10,
    name: "Optimism",
    networkName: "Optimism Mainnet",
    rpcUrl: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    currency: "ETH",
    testnet: false
  },

  // Arbitrum One
  42161: {
    id: 42161,
    name: "Arbitrum",
    networkName: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    currency: "ETH",
    testnet: false
  },

  // Base Mainnet
  8453: {
    id: 8453,
    name: "Base",
    networkName: "Base Mainnet",
    rpcUrl: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    currency: "ETH",
    testnet: false
  },

  // Monad Testnet
  10143: {
    id: 10143,
    name: "Monad Testnet",
    networkName: "Monad Testnet",
    rpcUrl: "https://testnet-rpc.monad.xyz",
    explorer: "https://testnet.monadexplorer.com",
    currency: "MON",
    testnet: true
  },

  // Monad Mainnet Beta
  143: {
    id: 143,
    name: "Monad",
    networkName: "Monad Mainnet",
    rpcUrl: "https://rpc-mainnet.monadinfra.com/rpc/8zyAEY3aBKskF69N7ppD9ZzAVgEQAfWZ",
    explorer: "https://mainnet-beta.monvision.io",
    currency: "MON",
    testnet: false
  },

  // Apechain Mainnet
  33139: {
    id: 33139,
    name: "Apechain",
    networkName: "Apechain Mainnet",
    rpcUrl: "https://rpc.apechain.com",
    explorer: "https://apescan.io",
    currency: "APE",
    testnet: false
  },

  // HyperVM Mainnet
  999: {
    id: 999,
    name: "HyperVM",
    networkName: "HyperVM Mainnet",
    rpcUrl: "https://rpc.hypurrscan.io",
    explorer: "https://hypurrscan.io",
    currency: "HYPE",
    testnet: false
  },

  // Taiko Mainnet
  167000: {
    id: 167000,
    name: "Taiko",
    networkName: "Taiko Alethia",
    rpcUrl: "https://rpc.taiko.xyz",
    explorer: "https://taikoscan.io",
    currency: "TAIKO",
    testnet: false
  }
};

// Helper function to get chain config by ID
export function getChainConfig(chainId) {
  return chainConfigs[chainId] || null;
}

// Helper function to get explorer URL for a specific chain
export function getExplorerUrl(chainId, type = 'tx', hash) {
  const config = getChainConfig(chainId);
  if (!config) return null;

  const baseUrl = config.explorer;
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${hash}`;
    case 'address':
      return `${baseUrl}/address/${hash}`;
    case 'block':
      return `${baseUrl}/block/${hash}`;
    default:
      return baseUrl;
  }
}

// Helper function to get RPC URL for a specific chain
export function getRpcUrl(chainId) {
  const config = getChainConfig(chainId);
  return config ? config.rpcUrl : null;
}
