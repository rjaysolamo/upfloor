require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");
require("dotenv").config(); // For loading environment variables
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1, // Optimize for deployment cost (smaller contract size)
      },
      viaIR: true, // Enable IR-based code generation to handle stack too deep
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      // Default hardhat network configuration
    },
    taikohekla: {
      url: `https://taiko-hekla.blockpi.network/v1/rpc/public`, // Taiko Helka RPC URL
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/OPLiHQCXVIkbWUj74xeWKFU4nPz6hp0a`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    apechain: {
      url: "https://rpc.apechain.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 33139, // ApeChain mainnet chain ID
      gasPrice: "auto"
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42161, // Arbitrum One chain ID
      gasPrice: "auto"
    },
    base: {
      url: "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453, // Base mainnet chain ID
      gasPrice: "auto"
    },
    optimism: {
      url: "https://mainnet.optimism.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10, // Optimism mainnet chain ID
      gasPrice: "auto"
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137, // Polygon mainnet chain ID
      gasPrice: "auto"
    },
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614, // Arbitrum Sepolia chain ID
      gasPrice: "auto"
    },
    monad: {
      url: "https://testnet-rpc.monad.xyz/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10143, // Monad testnet chain ID
      gasPrice: "auto"
    },
    monadmainnet: {
      url: "https://rpc-mainnet.monadinfra.com/rpc/8zyAEY3aBKskF69N7ppD9ZzAVgEQAfWZ",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 143, // Monad mainnet chain ID
      gasPrice: "auto"
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532, // Base Sepolia chain ID
      gasPrice: "auto"
    },
    hyperevm: {
      url: "https://hyperliquid-mainnet.g.alchemy.com/v2/OPLiHQCXVIkbWUj74xeWKFU4nPz6hp0a",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 999, // HyperEVM chain ID
      gasPrice: "auto"
    },
    taikoalethia: {
      url: "https://rpc.taiko.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 167000, // Taiko Alethia chain ID
      gasPrice: "auto"
    },
    taikohoodi: {
      url: "https://rpc.hoodi.taiko.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 167013, // Taiko Hoodi testnet chain ID
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: "U42S46F9HAIY1NV5U2P186USKB6N89KEQP",
    customChains: [
      {
        network: "apechain",
        chainId: 33139,
        urls: {
          apiURL: "https://api.apescan.io/api",
          browserURL: "https://apescan.io/"
        }
      },
      {
        network: "taikohekla",
        chainId: 167009,
        urls: {
          apiURL: "https://api-hekla.taikoscan.io/api",
          browserURL: "https://hekla.taikoscan.io/"
        }
      },
      {
        network: "taikoalethia",
        chainId: 167000,
        urls: {
          apiURL: "https://api.taikoscan.io/api",
          browserURL: "https://taikoscan.io/"
        }
      },
      {
        network: "taikohoodi",
        chainId: 167013,
        urls: {
          apiURL: "https://api-hoodi.taikoscan.io/api",
          browserURL: "https://hoodi.taikoscan.io/"
        }
      },
      {
        network: "monad",
        chainId: 10143,
        urls: {
          apiURL: "https://sourcify-api-monad.blockvision.org",
          browserURL: "https://testnet.monadexplorer.com"
        }
      },
      {
        network: "optimism",
        chainId: 10,
        urls: {
          apiURL: "https://api-optimistic.etherscan.io/api",
          browserURL: "https://optimistic.etherscan.io/"
        }
      },
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com/"
        }
      }
    ]
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify-api-monad.blockvision.org",
    browserUrl: "https://testnet.monadexplorer.com"
  }
};