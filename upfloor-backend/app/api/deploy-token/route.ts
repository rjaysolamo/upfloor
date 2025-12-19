import { encodeFunctionData, createPublicClient, http } from "viem";
import { NextRequest, NextResponse } from "next/server";

// Factory ABI
const factoryAbi = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_symbol",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "_nftCollection",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_collectionOwnerAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_royaltyRecipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_royaltyBps",
        "type": "uint256"
      }
    ],
    "name": "deployStrategyToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "router",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "strategy",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDeploymentFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "HYPE_DEPLOYMENT_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "APE_DEPLOYMENT_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ETH_DEPLOYMENT_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PROTOCOL_FEE_RECIPIENT",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "deployer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "router",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "strategy",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "deploymentFee",
        "type": "uint256"
      }
    ],
    "name": "TokenDeployed",
    "type": "event"
  }
] as const;

// Factory addresses for different chains
const FACTORY_ADDRESSES = {
  33139: "0x2fC63b3F35F5738BeE40727cd0697177Af7E78a0", // Apechain Mainnet -
  10143: "0xf0945Db3648b01F423444980C0e9180A6CF13352", // Monad Testnet - 
  143: "0x5EE7b8e36636EABF89513b1E456E0E36cC296f5E", // Monad Mainnet Beta
  999: "0x3f5a6dfd97d6e5d8ef2ea6dd242d94ae5fde1e6d", // hyper evm mainnet
  167000: "0xbE610B40FDDe8e7f48388234A6b48cAFbeEf7d2C", // Taiko Alethia
  42161: "0xa04da54ce66485F96319eD81a0C81f471d241Fdd", // Arbitrum One
} as const;

// RPC URLs for different chains
const RPC_URLS = {
  33139: "https://apechain.calderachain.xyz/http",
  10143: "https://testnet-rpc.monad.xyz",
  143: "https://rpc1.monad.xyz",
  999: "https://api.hyperliquid.xyz/evm",
  167000: "https://rpc.hekla.taiko.xyz",
  42161: "https://arb1.arbitrum.io/rpc",
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenName, tokenSymbol, nftCollection, collectionOwner, chainId, royaltyPercentage, royaltyRecipient } = body;

    if (!tokenName || !tokenSymbol || !nftCollection || !collectionOwner || !chainId || royaltyPercentage === undefined || !royaltyRecipient) {
      return NextResponse.json(
        { error: "Missing required fields: tokenName, tokenSymbol, nftCollection, collectionOwner, chainId, royaltyPercentage, royaltyRecipient" },
        { status: 400 }
      );
    }

    // Validate Ethereum addresses
    const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
    if (!isValidAddress(nftCollection)) {
      return NextResponse.json(
        { error: "Invalid nftCollection address format" },
        { status: 400 }
      );
    }
    if (!isValidAddress(collectionOwner)) {
      return NextResponse.json(
        { error: "Invalid collectionOwner address format" },
        { status: 400 }
      );
    }
    if (!isValidAddress(royaltyRecipient)) {
      return NextResponse.json(
        { error: "Invalid royaltyRecipient address format" },
        { status: 400 }
      );
    }

    // Get factory address based on chain ID
    const factoryAddress = FACTORY_ADDRESSES[chainId as keyof typeof FACTORY_ADDRESSES];

    if (!factoryAddress) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(FACTORY_ADDRESSES).join(', ')}` },
        { status: 400 }
      );
    }

    // Convert percentage to basis points (e.g., 3% = 300 basis points)
    const royaltyBps = Math.round(parseFloat(royaltyPercentage) * 100);

    // Fetch deployment fee from the factory contract
    let deploymentFee = "0";
    try {
      const rpcUrl = RPC_URLS[chainId as keyof typeof RPC_URLS];
      if (rpcUrl) {
        const client = createPublicClient({
          transport: http(rpcUrl),
        });

        // Use chain-specific deployment fee functions
        let functionName = "ETH_DEPLOYMENT_FEE"; // Default to ETH fee
        if (chainId === 999) {
          functionName = "HYPE_DEPLOYMENT_FEE";
        } else if (chainId === 33139 || chainId === 143) {
          functionName = "APE_DEPLOYMENT_FEE";
        } else if (chainId === 10143) {
          functionName = "getDeploymentFee"; // Monad uses generic function
        }
        // All other chains (including Taiko 167000) use ETH_DEPLOYMENT_FEE

        const fee = await client.readContract({
          address: factoryAddress as `0x${string}`,
          abi: factoryAbi,
          functionName: functionName as any,
        });

        deploymentFee = fee.toString();
      }
    } catch (error) {
      console.warn("Failed to fetch deployment fee:", error);
      // Continue without fee - let the frontend handle it
    }

    const calldata = encodeFunctionData({
      abi: factoryAbi,
      functionName: "deployStrategyToken",
      args: [tokenName, tokenSymbol, nftCollection as `0x${string}`, collectionOwner as `0x${string}`, royaltyRecipient as `0x${string}`, BigInt(royaltyBps)],
    });

    return NextResponse.json({
      to: factoryAddress,
      data: calldata,
      chainId: chainId,
      royaltyBps: royaltyBps,
      royaltyPercentage: royaltyPercentage,
      deploymentFee: deploymentFee,
      value: deploymentFee, // Include as 'value' for transaction
    });
  } catch (err) {
    console.error("Encoding error:", err);
    return NextResponse.json(
      { error: "Internal error preparing transaction" },
      { status: 500 }
    );
  }
}
