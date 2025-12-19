"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import { chainConfigs } from "@/lib/chainlist"
import { useAccount, usePublicClient, useWalletClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { createPublicClient, http, formatUnits, encodeFunctionData, parseEther } from "viem"
import { ShoppingCart, TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import { toast, Toaster } from "sonner"
import { getTransactionErrorMessage, shouldLogError } from "@/lib/transaction-errors"
import { useTheme } from "@/components/theme-provider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Collection data interface
interface CollectionData {
  id: number;
  collection_name: string;
  collection_owner: string;
  chain_id: number;
  token_address: string;
  router_address: string;
  strategy_address: string;
  royalties_address: string;
  deployer_address: string;
  transaction_hash: string;
  block_number: number;
  token_symbol: string;
  collection_image?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  telegram_id?: string;
  opensea_slug?: string;
  total_supply?: number;
  listed_count?: number;
  floor_price?: string;
  market_cap?: string;
  opensea_data_updated_at?: string;
  created_at: string;
  updated_at: string;
  network_name: string;
  explorer_base_url: string;
}

// NFT interface for owned tokens
interface OwnedNFT {
  id: string;
  name: string;
  owner: string;
  listed?: boolean;
  price?: number;
  purchasedAt?: string;
  marketplace?: string;
}

// Contract ABIs
const ROUTER_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

const TOKEN_ABI = [
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "result", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "curve",
    "outputs": [
      {
        "components": [
          { "internalType": "uint128", "name": "p0", "type": "uint128" },
          { "internalType": "uint128", "name": "k", "type": "uint128" }
        ],
        "internalType": "struct QuadraticCurve.Params",
        "name": "p",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "result", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "address", "name": "receiver", "type": "address" }
    ],
    "name": "mintWithTaiko",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "previewMint",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC-20 Token ABI (for TAIKO token balanceOf)
const ERC20_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const STRATEGY_ABI = [
  {
    "inputs": [],
    "name": "getActiveTokenIds",
    "outputs": [{ "internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveAuctionCount",
    "outputs": [{ "internalType": "uint256", "name": "count", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "auctions",
    "outputs": [
      { "internalType": "bool", "name": "active", "type": "bool" },
      { "internalType": "uint256", "name": "auctionId", "type": "uint256" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "uint256", "name": "currentPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "startPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "endPrice", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "currentAuctionPrice",
    "outputs": [{ "internalType": "uint256", "name": "price", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minSellPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "acceptBid",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "hasPendingProposal",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "startPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "endPrice", "type": "uint256" }
    ],
    "name": "proposeAuction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// TAIKO token address and ABI (for Taiko chain transactions)
const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"

const TAIKO_TOKEN_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Bonding curve price calculation functions
function getPriceForTokens(tokens: number, currentSupply: number, K: number, feeRate: number): number {
  const s = currentSupply;
  return K * (s * s * tokens + s * tokens * tokens + tokens * tokens * tokens / 3) * (1 + feeRate);
}

function getTokensForETH(ethAmount: number, currentSupply: number, K: number, feeRate: number): number {
  let low = 0;
  let high = 1_000_000;
  let best = 0;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const cost = getPriceForTokens(mid, currentSupply, K, feeRate);

    if (cost <= ethAmount) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }

    if (Math.abs(high - low) < 1e-9) break;
  }

  return best;
}

export default function ListingPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { writeContract, data: hash, isPending, error: contractError } = useWriteContract()
  const { isDarkMode } = useTheme()

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })


  // State for collection data
  const [collectionData, setCollectionData] = useState<CollectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for contract balance
  const [contractBalance, setContractBalance] = useState<number | null>(null)
  const [contractBalanceLoading, setContractBalanceLoading] = useState(false)

  // NFT balance and owned tokens state
  const [nftBalance, setNftBalance] = useState<number>(0)
  const [ownedNfts, setOwnedNfts] = useState<OwnedNFT[]>([])
  const [nftLoading, setNftLoading] = useState(false)
  const [nftError, setNftError] = useState<string | null>(null)
  const [nftsLoaded, setNftsLoaded] = useState(false)

  // Auction state
  const [activeAuctions, setActiveAuctions] = useState<any[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(false)
  const [auctionsLoaded, setAuctionsLoaded] = useState(false)

  // Accept bid state
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null)
  const [userTokenBalance, setUserTokenBalance] = useState<bigint>(BigInt(0))

  // List NFTs for approval state
  const [ownerNfts, setOwnerNfts] = useState<OwnedNFT[]>([])
  const [ownerNftsLoading, setOwnerNftsLoading] = useState(false)
  const [ownerNftsLoaded, setOwnerNftsLoaded] = useState(false)
  const [proposingAuction, setProposingAuction] = useState<string | null>(null)
  const [nftOwnership, setNftOwnership] = useState<Record<string, 'user' | 'strategy'>>({})
  const [proposalModal, setProposalModal] = useState<{
    isOpen: boolean
    tokenId: string | null
    startPrice: string
    endPrice: string
  }>({
    isOpen: false,
    tokenId: null,
    startPrice: '',
    endPrice: ''
  })

  // Buy NFT state
  const [floorListing, setFloorListing] = useState<any>(null)
  const [loadingFloorPrice, setLoadingFloorPrice] = useState(false)
  const [buyingNFT, setBuyingNFT] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)

  // Trade modal state
  const [tradeModal, setTradeModal] = useState({
    isOpen: false,
    amount: '',
    estimatedTokens: 0,
    estimatedCost: 0,
    currentSupply: 0,
    K: 0,
    isLoading: false,
    isExecuting: false,
    txHash: null as string | null
  })

  // Get image from collection data or fallback to search param or default
  const img = collectionData?.collection_image || search?.get("img") || "/brand/doonprofile.png"

  // Get addresses from collection data or fallback to dummy data
  const tokenAddress = collectionData?.token_address || "0xAbCDEF0123456789abCDEF0123456789ABcDeF01"
  const strategyAddress = collectionData?.strategy_address || "0x1111222233334444555566667777888899990000"


  // Fetch collection data on component mount
  useEffect(() => {
    const fetchCollectionData = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/collections/${slug}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Collection not found");
          } else {
            setError("Failed to load collection data");
          }
          return;
        }

        const data = await response.json();
        setCollectionData(data.collection);
      } catch (err) {
        console.error("Error fetching collection data:", err);
        setError("Failed to load collection data");
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionData();
  }, [slug]);

  // Fetch contract balance when collection data is available
  useEffect(() => {
    const fetchContractBalance = async () => {
      if (!collectionData?.token_address) return;

      try {
        setContractBalanceLoading(true);

        const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
        if (!chainConfig?.rpcUrl) {
          console.error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
          setContractBalance(null);
          return;
        }

        const client = createPublicClient({
          transport: http(chainConfig.rpcUrl),
        });

        let balance: bigint;

        // For Taiko chain (167000), fetch TAIKO token balance instead of native balance
        if (collectionData.chain_id === 167000) {
          const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975";
          balance = await client.readContract({
            address: TAIKO_TOKEN_ADDRESS as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [collectionData.token_address as `0x${string}`]
          });
        } else {
          // For other chains, fetch native currency balance
          balance = await client.getBalance({
            address: collectionData.token_address as `0x${string}`
          });
        }

        const balanceInNative = Number(balance) / 1e18;
        setContractBalance(balanceInNative);
      } catch (error) {
        console.error("Error fetching contract balance:", error);
        setContractBalance(null);
      } finally {
        setContractBalanceLoading(false);
      }
    };

    fetchContractBalance();
  }, [collectionData?.token_address, collectionData?.chain_id]);

  // Auto-fetch active auctions when collection data is available
  useEffect(() => {
    if (collectionData?.strategy_address && !auctionsLoaded) {
      console.log('Auto-fetching active auctions...');
      fetchActiveAuctions();
    }
  }, [collectionData?.strategy_address]);

  // Auto-fetch owner NFTs when collection data is available
  useEffect(() => {
    if (collectionData?.token_symbol && !ownerNftsLoaded) {
      console.log('Auto-fetching owner NFTs from database...');
      fetchOwnerNFTs();
    }
  }, [collectionData?.token_symbol]);

  // Fetch user token balance when connected
  useEffect(() => {
    if (isConnected && address && collectionData?.token_address) {
      fetchUserTokenBalance();
    }
  }, [isConnected, address, collectionData?.token_address]);

  // Handle transaction status updates
  useEffect(() => {
    if (hash) {
      setTradeModal(prev => ({ ...prev, txHash: hash, isExecuting: true }))
      toast.loading("Transaction submitted...", { id: hash })
    }
  }, [hash])

  useEffect(() => {
    if (isConfirmed && tradeModal.txHash) {
      setTradeModal(prev => ({ ...prev, isExecuting: false }))
      toast.success("Transaction confirmed!", { id: tradeModal.txHash })

      // Refresh user token balance after successful trade
      if (isConnected && address && collectionData?.token_address) {
        fetchUserTokenBalance();
      }

      // Reset modal after successful transaction
      setTimeout(() => {
        closeTradeModal()
      }, 2000)
    }
  }, [isConfirmed, tradeModal.txHash])

  useEffect(() => {
    if (contractError) {
      setTradeModal(prev => ({ ...prev, isExecuting: false }))

      if (shouldLogError(contractError)) {
        console.error('Contract error:', contractError)
      }

      const errorInfo = getTransactionErrorMessage(contractError)

      if (errorInfo.variant === 'destructive') {
        toast.error(`${errorInfo.title}: ${errorInfo.description}`)
      } else {
        toast.info(`${errorInfo.title}: ${errorInfo.description}`)
      }
    }
  }, [contractError])

  // Utility function to get currency symbol based on chain ID
  const getCurrencySymbol = (chainId: number | undefined) => {
    if (!chainId) return 'ETH';
    // Special case for Taiko chain - display TAIKO instead of ETH
    if (chainId === 167000) return 'TAIKO';
    const config = Object.values(chainConfigs).find(c => c.id === chainId);
    return config?.currency || 'ETH';
  };

  // Utility functions for formatting OpenSea data
  const formatWeiToEth = (wei: string) => {
    if (!wei) return '0';

    let weiValue: string;
    if (wei.includes('e+') || wei.includes('E+')) {
      const num = parseFloat(wei);
      weiValue = num.toLocaleString('fullwide', { useGrouping: false });
    } else {
      weiValue = wei;
    }

    try {
      const eth = BigInt(weiValue) / BigInt('1000000000000000000');
      const remainder = BigInt(weiValue) % BigInt('1000000000000000000');
      const decimals = Number(remainder) / 1e18;
      const value = Number(eth) + decimals;
      return value % 1 === 0 ? value.toString() : value.toFixed(4).replace(/\.?0+$/, '');
    } catch (error) {
      const numValue = parseFloat(wei);
      const ethValue = numValue / 1e18;
      return ethValue % 1 === 0 ? ethValue.toString() : ethValue.toFixed(4).replace(/\.?0+$/, '');
    }
  };

  const formatMarketCap = (marketCap: string, chainId: number | undefined) => {
    if (!marketCap) return '0';
    const eth = formatWeiToEth(marketCap);
    const num = parseFloat(eth);
    const currency = getCurrencySymbol(chainId);

    if (num >= 1000000) {
      const mValue = num / 1000000;
      const formattedM = mValue % 1 === 0 ? mValue.toString() : mValue.toFixed(2).replace(/\.?0+$/, '');
      return `${formattedM}M ${currency}`;
    } else if (num >= 1000) {
      const kValue = num / 1000;
      const formattedK = kValue % 1 === 0 ? kValue.toString() : kValue.toFixed(2).replace(/\.?0+$/, '');
      return `${formattedK}K ${currency}`;
    }
    return `${eth} ${currency}`;
  };

  const copy = (t: string) => {
    try {
      navigator.clipboard?.writeText(t)
    } catch { }
  }

  // Map chain ID to OpenSea chain name
  const getOpenSeaChainName = (chainId: number | undefined) => {
    const chainMap: { [key: number]: string } = {
      1: 'ethereum',
      137: 'matic',
      10: 'optimism',
      42161: 'arbitrum',
      8453: 'base',
      33139: 'ape_chain',
      11155111: 'sepolia'
    };
    return chainMap[chainId || 1] || 'ethereum';
  };

  // Determine which marketplace to use based on chain ID
  const getMarketplace = (chainId: number | undefined) => {
    if (chainId === 10143) {
      return 'magiceden'; // Monad Testnet uses Magic Eden
    }
    if (chainId === 167000) {
      return 'okidori'; // Taiko Mainnet uses Okidori
    }
    return 'opensea'; // Default to OpenSea for other chains
  };

  // Fetch active auctions
  const fetchActiveAuctions = async () => {
    if (!collectionData?.strategy_address) return;

    try {
      setAuctionsLoading(true);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      // Get active token IDs
      const activeTokenIds = await client.readContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'getActiveTokenIds',
      }) as bigint[];

      console.log('Active auction token IDs:', activeTokenIds);

      if (activeTokenIds.length === 0) {
        setActiveAuctions([]);
        setAuctionsLoaded(true);
        setAuctionsLoading(false);
        return;
      }

      // Fetch auction details for each token
      const auctions = [];
      for (const tokenId of activeTokenIds) {
        try {
          const [auctionResult, currentPrice] = await Promise.all([
            client.readContract({
              address: collectionData.strategy_address as `0x${string}`,
              abi: STRATEGY_ABI,
              functionName: 'auctions',
              args: [tokenId],
            }),
            client.readContract({
              address: collectionData.strategy_address as `0x${string}`,
              abi: STRATEGY_ABI,
              functionName: 'currentAuctionPrice',
              args: [tokenId],
            }) as Promise<bigint>
          ]);

          // Auction returns: [active, auctionId, tokenId, startTime, currentPrice, startPrice, endPrice]
          // Access as array to handle the tuple type
          const auction = auctionResult as readonly [boolean, bigint, bigint, bigint, bigint, bigint, bigint];

          auctions.push({
            tokenId: tokenId.toString(),
            auctionId: auction[1]?.toString() || '',
            active: auction[0] || false,
            startPrice: auction[5]?.toString() || '0',
            endPrice: auction[6]?.toString() || '0',
            currentPrice: currentPrice?.toString() || '0',
            startTime: auction[3]?.toString() || '0',
          });
        } catch (error) {
          console.error(`Error fetching auction for token ${tokenId}:`, error);
        }
      }

      console.log('Fetched auctions:', auctions);
      setActiveAuctions(auctions);
      setAuctionsLoaded(true);
    } catch (error) {
      console.error('Error fetching active auctions:', error);
      toast.error('Failed to load active auctions');
    } finally {
      setAuctionsLoading(false);
    }
  };

  // Fetch user token balance
  const fetchUserTokenBalance = async () => {
    if (!address || !collectionData?.token_address) return;

    try {
      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        console.error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
        return;
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const balance = await client.readContract({
        address: collectionData.token_address as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }) as bigint;

      setUserTokenBalance(balance);
      console.log('User token balance:', formatUnits(balance, 18));
    } catch (error) {
      console.error('Error fetching user token balance:', error);
    }
  };

  // Accept bid on auction
  const handleAcceptBid = async (tokenId: string) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!collectionData?.strategy_address || !collectionData?.token_address) {
      toast.error('Collection data not available');
      return;
    }

    if (!publicClient || !walletClient) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      setAcceptingBid(tokenId);

      // Log addresses for debugging
      console.log('=== Accept Bid Debug Info ===');
      console.log('Token Address:', collectionData.token_address);
      console.log('Strategy Address:', collectionData.strategy_address);
      console.log('NFT Token ID:', tokenId);
      console.log('User Address:', address);
      console.log('Chain ID:', collectionData.chain_id);

      // Create a dedicated client for this chain
      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      // Step 1: Get CURRENT auction price (it changes every second)
      toast.loading('Fetching current auction price...', { id: 'fetch-price' });

      const currentPrice = await client.readContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'currentAuctionPrice',
        args: [BigInt(tokenId)],
      }) as bigint;

      console.log('Current auction price (wei):', currentPrice.toString());
      console.log('Current auction price (tokens):', formatUnits(currentPrice, 18));
      toast.dismiss('fetch-price');

      // Step 2: Check if user has enough tokens
      toast.loading('Checking token balance...', { id: 'check-balance' });

      const balance = await client.readContract({
        address: collectionData.token_address as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }) as bigint;

      console.log('User balance (wei):', balance.toString());
      console.log('User balance (tokens):', formatUnits(balance, 18));
      console.log('Required (tokens):', formatUnits(currentPrice, 18));
      toast.dismiss('check-balance');

      if (balance < currentPrice) {
        toast.error(`Insufficient tokens. You need ${formatUnits(currentPrice, 18)} ${collectionData.token_symbol} but have ${formatUnits(balance, 18)}`);
        setAcceptingBid(null);
        return;
      }

      // Step 3: Approve tokens for strategy contract
      toast.loading('Please approve tokens in your wallet...', { id: 'approve-tx' });

      console.log('Approving', formatUnits(currentPrice, 18), 'tokens for strategy...');

      const approveTxHash = await walletClient.writeContract({
        address: collectionData.token_address as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'approve',
        args: [collectionData.strategy_address as `0x${string}`, currentPrice],
      });

      console.log('Approval tx hash:', approveTxHash);
      toast.loading('Waiting for approval confirmation...', { id: 'approve-tx' });

      // Wait for approval transaction to be mined
      await client.waitForTransactionReceipt({
        hash: approveTxHash,
      });

      console.log('Approval confirmed!');
      toast.success('Tokens approved!', { id: 'approve-tx' });

      // Small delay to ensure approval is processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Accept the bid
      toast.loading('Please confirm bid acceptance in your wallet...', { id: 'accept-bid' });

      console.log('Accepting bid for token ID:', tokenId);

      const bidTxHash = await walletClient.writeContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'acceptBid',
        args: [BigInt(tokenId)],
      });

      console.log('Accept bid tx hash:', bidTxHash);
      toast.loading('Waiting for transaction confirmation...', { id: 'accept-bid' });

      // Wait for bid acceptance transaction to be mined
      await client.waitForTransactionReceipt({
        hash: bidTxHash,
      });

      console.log('Bid accepted successfully!');
      toast.success(`Bid accepted! NFT #${tokenId} is now yours!`, { id: 'accept-bid' });

      // Remove NFT from database since it's been sold
      try {
        console.log(`??? Removing NFT #${tokenId} from database...`);
        const removeResponse = await fetch(
          `/api/collections/${collectionData.token_symbol}/nfts?tokenId=${tokenId}`,
          { method: 'DELETE' }
        );

        if (removeResponse.ok) {
          console.log(`? NFT #${tokenId} removed from database`);
        } else {
          const errorData = await removeResponse.json();
          console.error('Failed to remove NFT from database:', errorData);
        }
      } catch (dbError) {
        console.error('Error removing NFT from database:', dbError);
        // Don't block the UI if database update fails
      }

      // Refresh auctions and balances
      setTimeout(() => {
        fetchActiveAuctions();
        fetchUserTokenBalance();
        setAcceptingBid(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error accepting bid:', error);
      console.error('Error details:', {
        message: error.message,
        cause: error.cause,
        stack: error.stack
      });

      setAcceptingBid(null);
      toast.dismiss('fetch-price');
      toast.dismiss('check-balance');
      toast.dismiss('approve-tx');
      toast.dismiss('accept-bid');

      if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        toast.info('Transaction rejected by user');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient funds for gas fees');
      } else if (error.message?.includes('returned no data')) {
        toast.error('Contract function not found. Please verify the strategy address is correct.');
      } else {
        const errorMsg = error.message || 'Unknown error';
        toast.error('Failed to accept bid: ' + errorMsg.slice(0, 100));
      }
    }
  };

  // NFT fetching functions (same as collection page)
  const fetchNFTBalance = async (userAddress: string, collectionData: CollectionData) => {
    if (!userAddress || !collectionData) return;

    try {
      setNftLoading(true);
      setNftError(null);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const erc721Abi = [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: 'balance', type: 'uint256' }],
        },
        {
          name: 'tokenOfOwnerByIndex',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'index', type: 'uint256' }
          ],
          outputs: [{ name: 'tokenId', type: 'uint256' }],
        },
        {
          name: 'ownerOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          outputs: [{ name: 'owner', type: 'address' }],
        },
        {
          name: 'totalSupply',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: 'totalSupply', type: 'uint256' }],
        }
      ] as const;

      const nftContractAddress = collectionData.collection_owner;
      const ownerAddress = userAddress;

      const balance = await client.readContract({
        address: nftContractAddress as `0x${string}`,
        abi: erc721Abi,
        functionName: 'balanceOf',
        args: [ownerAddress as `0x${string}`],
      } as any);

      const balanceNumber = Number(balance);
      setNftBalance(balanceNumber);

      if (balanceNumber === 0) {
        setOwnedNfts([]);
        setNftsLoaded(true);
        return;
      }

      const tokenIds: string[] = [];
      let method1Success = false;

      try {
        for (let i = 0; i < balanceNumber; i++) {
          try {
            const tokenId = await client.readContract({
              address: nftContractAddress as `0x${string}`,
              abi: erc721Abi,
              functionName: 'tokenOfOwnerByIndex',
              args: [ownerAddress as `0x${string}`, BigInt(i)],
            } as any);

            let tokenIdStr: string;
            if (typeof tokenId === 'bigint' || typeof tokenId === 'number') {
              tokenIdStr = tokenId.toString();
            } else if (typeof tokenId === 'string') {
              try {
                if (tokenId.startsWith('0x')) {
                  tokenIdStr = BigInt(tokenId).toString();
                } else {
                  tokenIdStr = tokenId;
                }
              } catch (stringParseErr) {
                throw new Error(`Invalid tokenId string: ${tokenId}`);
              }
            } else {
              throw new Error(`Unsupported tokenId type: ${typeof tokenId}`);
            }

            tokenIds.push(tokenIdStr);

          } catch (err) {
            if (i === 0) {
              console.log('tokenOfOwnerByIndex not supported, falling back to ownerOf method');
              throw new Error('tokenOfOwnerByIndex not supported or failed');
            }
          }
        }

        if (tokenIds.length === balanceNumber) {
          method1Success = true;
          console.log('Method 1 successful:', tokenIds);
        } else {
          throw new Error(`Method 1 incomplete: got ${tokenIds.length}/${balanceNumber} tokens`);
        }
      } catch (err) {
        console.log('Method 1 failed, will try Method 2:', err instanceof Error ? err.message : 'Unknown error');
        tokenIds.length = 0;
      }

      if (!method1Success) {
        console.log('Trying method 2: ownerOf enumeration');

        let maxCheck = 10000;
        try {
          const totalSupply = await client.readContract({
            address: nftContractAddress as `0x${string}`,
            abi: erc721Abi,
            functionName: 'totalSupply',
          } as any);
          maxCheck = Math.min(Number(totalSupply), 10000);
          console.log(`Using totalSupply: ${maxCheck} tokens to check`);
        } catch (err) {
          console.warn('totalSupply not available, using default range:', err instanceof Error ? err.message : 'Unknown error');
          maxCheck = Math.min(10000, balanceNumber * 20);
        }

        console.log(`Checking token IDs 1 to ${maxCheck}`);

        for (let id = 1; id <= maxCheck && tokenIds.length < balanceNumber; id++) {
          try {
            const owner = await client.readContract({
              address: nftContractAddress as `0x${string}`,
              abi: erc721Abi,
              functionName: 'ownerOf',
              args: [BigInt(id)],
            } as any);

            if (typeof owner === 'string' && owner.toLowerCase() === ownerAddress.toLowerCase()) {
              tokenIds.push(id.toString());
              console.log(`Found owned token ID: ${id}`);
            }
          } catch (err) {
            if (id % 100 === 0) {
              console.log(`Checked ${id} tokens, found ${tokenIds.length} owned`);
            }
          }
        }

        console.log(`Method 2 found ${tokenIds.length}/${balanceNumber} tokens`);
      }

      const nfts: OwnedNFT[] = tokenIds.map(tokenId => ({
        id: tokenId,
        name: `${collectionData.collection_name} #${tokenId}`,
        owner: ownerAddress,
        listed: false,
      }));

      setOwnedNfts(nfts);
      setNftsLoaded(true);

      console.log('Successfully loaded NFTs:', nfts);

    } catch (error) {
      console.error('Error fetching NFT balance:', error);
      setNftError(error instanceof Error ? error.message : 'Failed to fetch NFT balance');
    } finally {
      setNftLoading(false);
    }
  };

  // Trade modal functions
  const openTradeModal = async () => {
    if (!isConnected) {
      alert('Please connect your wallet to trade')
      return
    }

    if (!collectionData) return

    setTradeModal(prev => ({
      ...prev,
      isOpen: true,
      amount: '',
      estimatedTokens: 0,
      estimatedCost: 0,
      currentSupply: 0,
      K: 0,
      isLoading: true
    }))

    try {
      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const [totalSupply, curve] = await Promise.all([
        client.readContract({
          address: collectionData.token_address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'totalSupply'
        }).catch(() => BigInt(0)),
        client.readContract({
          address: collectionData.token_address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'curve'
        }).catch(() => null)
      ])

      const currentSupply = Number(totalSupply || BigInt(0)) / 1e18
      let K = 0.0001

      if (curve) {
        K = Number(curve.k) / 1e18
      }

      setTradeModal(prev => ({
        ...prev,
        currentSupply,
        K,
        isLoading: false
      }))

    } catch (error) {
      console.error('Error fetching token data:', error)
      setTradeModal(prev => ({
        ...prev,
        isLoading: false
      }))
    }
  }

  const closeTradeModal = () => {
    setTradeModal({
      isOpen: false,
      amount: '',
      estimatedTokens: 0,
      estimatedCost: 0,
      currentSupply: 0,
      K: 0,
      isLoading: false,
      isExecuting: false,
      txHash: null
    })
  }

  const calculateTrade = (amount: string) => {
    // Always update the amount so user can edit/backspace
    setTradeModal(prev => ({
      ...prev,
      amount,
      estimatedTokens: 0,
      estimatedCost: 0
    }))

    // Only calculate if we have valid data
    if (!amount || !collectionData || !tradeModal.K) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return

    const FEE_RATE = 0.1
    const tokensForETH = getTokensForETH(amountNum, tradeModal.currentSupply, tradeModal.K, FEE_RATE)

    setTradeModal(prev => ({
      ...prev,
      amount,
      estimatedTokens: tokensForETH,
      estimatedCost: amountNum
    }))
  }

  const executeBuy = async () => {
    if (!collectionData || !address || !walletClient || !publicClient) return

    try {
      setTradeModal(prev => ({ ...prev, isExecuting: true }))

      const tokenAmountWei = BigInt(Math.floor(tradeModal.estimatedTokens * 1e18))
      const amountWei = BigInt(Math.floor(parseFloat(tradeModal.amount) * 1e18))

      // Check if this is Taiko chain (167000) - use TAIKO ERC-20 token
      if (collectionData.chain_id === 167000) {
        // Taiko chain - use TAIKO ERC-20 token for minting

        // Check TAIKO token balance
        const taikoBalance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: TAIKO_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        })

        if (taikoBalance < amountWei) {
          toast.error('Insufficient TAIKO', {
            description: `Need ${(Number(amountWei) / 1e18).toFixed(6)} TAIKO but you have ${(Number(taikoBalance) / 1e18).toFixed(6)} TAIKO`
          })
          return
        }

        // Check allowance - approve to TOKEN contract (not router)
        const currentAllowance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: TAIKO_TOKEN_ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, collectionData.token_address as `0x${string}`]
        }) as bigint

        console.log('TAIKO Allowance Check:', {
          currentAllowance: (Number(currentAllowance) / 1e18).toFixed(6),
          neededAmount: (Number(amountWei) / 1e18).toFixed(6),
          needsApproval: currentAllowance < amountWei
        })

        // Only approve if current allowance is insufficient
        if (currentAllowance < amountWei) {
          toast.info('Approving TAIKO', {
            description: 'Approving TAIKO token spending...'
          })

          try {
            // Approve a larger amount to avoid frequent approvals (approve 10x the needed amount)
            const approvalAmount = amountWei * BigInt(10) // Approve 10x the needed amount for future transactions

            const approveHash = await walletClient.writeContract({
              address: TAIKO_TOKEN_ADDRESS,
              abi: TAIKO_TOKEN_ABI,
              functionName: 'approve',
              args: [collectionData.token_address as `0x${string}`, approvalAmount]
            })

            // Wait for approval to complete
            await publicClient.waitForTransactionReceipt({ hash: approveHash })

            console.log('✅ TAIKO approval completed successfully')
            toast.success('TAIKO Approved', {
              description: 'Approval successful! Proceeding with transaction...'
            })
          } catch (approveError: any) {
            console.error('Approval failed:', approveError)
            toast.error('Approval Failed', {
              description: approveError.message?.includes('user rejected') ? 'Transaction rejected by user' : 'Failed to approve TAIKO tokens'
            })
            return
          }
        }

        // Execute mintWithTaiko transaction directly on TOKEN contract
        writeContract({
          address: collectionData.token_address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'mintWithTaiko',
          args: [tokenAmountWei, address as `0x${string}`]
        })

      } else {
        // All other chains - use native currency (ETH, MATIC, etc.)
        writeContract({
          address: collectionData.router_address as `0x${string}`,
          abi: ROUTER_ABI,
          functionName: 'mint',
          args: [tokenAmountWei, address as `0x${string}`],
          value: amountWei
        })
      }
    } catch (err) {
      console.error('Error executing buy:', err)
      toast.error('Failed to execute buy transaction')
      setTradeModal(prev => ({ ...prev, isExecuting: false }))
    }
  }

  // Fetch floor price listing from marketplace (OpenSea or Magic Eden)
  const fetchFloorListing = async () => {
    const marketplace = getMarketplace(collectionData?.chain_id);

    try {
      setLoadingFloorPrice(true);
      setBuyError(null);

      if (marketplace === 'magiceden') {
        // Magic Eden for Monad Testnet
        if (!collectionData?.collection_owner) {
          console.error('No contract address configured');
          setBuyError('No contract address configured');
          return;
        }

        console.log('?? Fetching floor listing from Magic Eden for:', collectionData.collection_owner);

        const response = await fetch(`/api/magiceden/floor-price/${collectionData.collection_owner}`);

        console.log('?? Magic Eden API Response Status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('? Magic Eden API Error:', errorData);
          throw new Error(errorData.error || `Failed to fetch listings: ${response.status}`);
        }

        const data = await response.json();
        console.log('? Magic Eden API Response:', data);

        if (!data.success || !data.listing) {
          throw new Error(data.error || 'No listing found');
        }

        const listing = data.listing;

        // Format the listing data for Magic Eden
        const formattedListing = {
          orderId: listing.orderId,
          tokenId: listing.tokenId,
          nftContractAddress: listing.contract,
          priceWei: BigInt(listing.price),
          currency: listing.currency,
          maker: listing.maker,
          validUntil: listing.validUntil,
          source: listing.source,
          kind: listing.kind,
          rawData: listing.rawData,
          marketplace: 'magiceden',
        };

        console.log('?? Magic Eden floor listing found:', {
          contract: formattedListing.nftContractAddress,
          tokenId: formattedListing.tokenId,
          price: formatUnits(formattedListing.priceWei, 18),
          currency: formattedListing.currency,
          orderId: formattedListing.orderId,
          rawData: formattedListing.rawData,
          tokenImage: formattedListing.rawData?.token?.image,
        });

        setFloorListing(formattedListing);
        toast.success(`Floor Price Loaded! Found NFT #${formattedListing.tokenId} for ${formatUnits(formattedListing.priceWei, 18)} ${formattedListing.currency}`);
      } else if (marketplace === 'okidori') {
        // Okidori for Taiko Mainnet
        if (!collectionData?.collection_owner) {
          console.error('No contract address configured');
          setBuyError('No contract address configured');
          return;
        }

        console.log('🎯 Fetching floor listing from Okidori for:', collectionData.collection_owner);

        const response = await fetch(`/api/okidori/floor-price/${collectionData.collection_owner}`);

        console.log('🎯 Okidori API Response Status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Okidori API Error:', errorData);
          throw new Error(errorData.error || `Failed to fetch listings: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Okidori API Response:', data);

        if (!data.success || !data.listing) {
          throw new Error(data.error || 'No listing found');
        }

        const listing = data.listing;

        // Format the listing data for Okidori
        const formattedListing = {
          orderId: listing.orderId || listing.listingIdOnChain?.toString(),
          tokenId: listing.tokenId,
          nftContractAddress: listing.contract,
          priceWei: BigInt(listing.price),
          currency: listing.currency,
          maker: listing.maker || listing.seller,
          validUntil: listing.validUntil,
          source: listing.source,
          kind: listing.kind,
          rawData: listing.rawData,
          marketplace: 'okidori',
          listingIdOnChain: listing.listingIdOnChain,
        };

        console.log('🎯 Okidori floor listing found:', {
          contract: formattedListing.nftContractAddress,
          tokenId: formattedListing.tokenId,
          price: formatUnits(formattedListing.priceWei, 18),
          currency: formattedListing.currency,
          orderId: formattedListing.orderId,
          listingIdOnChain: formattedListing.listingIdOnChain,
          rawData: formattedListing.rawData,
          tokenImage: formattedListing.rawData?.nft?.image,
        });

        setFloorListing(formattedListing);
        toast.success(`Floor Price Loaded! Found NFT #${formattedListing.tokenId} for ${formatUnits(formattedListing.priceWei, 18)} ${formattedListing.currency}`);
      } else {
        // OpenSea for other chains
        if (!collectionData?.opensea_slug) {
          console.error('No OpenSea slug configured');
          setBuyError('No OpenSea slug configured');
          return;
        }

        console.log('?? Fetching floor listing from OpenSea for:', collectionData.opensea_slug);

        const response = await fetch(`/api/floor-price/${collectionData.opensea_slug}`);

        console.log('?? OpenSea API Response Status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('? OpenSea API Error:', errorData);
          throw new Error(errorData.error || `Failed to fetch listings: ${response.status}`);
        }

        const data = await response.json();
        console.log('? OpenSea API Response:', data);

        if (!data.success || !data.listing) {
          throw new Error(data.error || 'No listing found');
        }

        const listing = data.listing;

        // Format the listing data for OpenSea
        const formattedListing = {
          order_hash: listing.orderHash,
          chain: listing.chain,
          protocol_address: listing.protocolAddress,
          protocol_data: listing.protocolData,
          nftContractAddress: listing.nftContractAddress,
          tokenId: listing.tokenId,
          priceWei: BigInt(listing.price),
          currency: listing.currency,
          type: listing.type,
          marketplace: 'opensea',
        };

        console.log('?? OpenSea floor listing found:', {
          contract: formattedListing.nftContractAddress,
          tokenId: formattedListing.tokenId,
          price: formatUnits(formattedListing.priceWei, 18),
          currency: formattedListing.currency,
          orderHash: formattedListing.order_hash,
        });

        setFloorListing(formattedListing);
        toast.success(`Floor Price Loaded! Found NFT #${formattedListing.tokenId} for ${formatUnits(formattedListing.priceWei, 18)} ${formattedListing.currency}`);
      }
    } catch (error: any) {
      console.error('? Error fetching floor listing:', error);
      const errorMessage = error?.message || 'Failed to fetch floor price';
      setBuyError(errorMessage);
      toast.error(`Error Loading Floor Price: ${errorMessage}`);
    } finally {
      setLoadingFloorPrice(false);
    }
  };

  // Check NFT ownership (user vs strategy)
  const checkNftOwnership = async (tokenIds: string[]) => {
    if (!collectionData?.collection_owner || !collectionData?.strategy_address) return;

    try {
      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) return;

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const erc721Abi = [{
        name: 'ownerOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: 'owner', type: 'address' }],
      }] as const;

      const ownership: Record<string, 'user' | 'strategy'> = {};

      for (const tokenId of tokenIds) {
        try {
          const owner = await client.readContract({
            address: collectionData.collection_owner as `0x${string}`, // Use NFT contract address
            abi: erc721Abi,
            functionName: 'ownerOf',
            args: [BigInt(tokenId)],
          });

          if (owner.toLowerCase() === collectionData.strategy_address.toLowerCase()) {
            ownership[tokenId] = 'strategy';
          } else {
            ownership[tokenId] = 'user';
          }
        } catch (error) {
          console.error(`Error checking ownership for token ${tokenId}:`, error);
          ownership[tokenId] = 'user'; // Default to user if error
        }
      }

      setNftOwnership(ownership);
    } catch (error) {
      console.error('Error checking NFT ownership:', error);
    }
  };

  // Fetch owner NFTs from database (owned_nfts column)
  const fetchOwnerNFTs = async () => {
    if (!collectionData?.token_symbol) return;

    try {
      setOwnerNftsLoading(true);

      console.log('??? Fetching owned NFTs from database for collection:', collectionData.token_symbol);

      // Fetch owned NFTs from database
      const response = await fetch(`/api/collections/${collectionData.token_symbol}/nfts`);

      if (!response.ok) {
        throw new Error(`Failed to fetch NFTs: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.nfts || !Array.isArray(data.nfts)) {
        console.log('No NFTs found in database');
        setOwnerNfts([]);
        setOwnerNftsLoaded(true);
        return;
      }

      // Convert database NFTs to our format
      const nfts: OwnedNFT[] = data.nfts.map((nft: any) => ({
        id: nft.tokenId,
        name: `${collectionData.collection_name} #${nft.tokenId}`,
        owner: address || '', // Current user
        listed: false,
        purchasedAt: nft.purchasedAt,
        marketplace: nft.marketplace
      }));

      setOwnerNfts(nfts);
      setOwnerNftsLoaded(true);

      // Check ownership for each NFT (user vs strategy)
      const tokenIds = nfts.map(nft => nft.id);
      await checkNftOwnership(tokenIds);

      console.log('? Successfully loaded owner NFTs from database:', nfts);

    } catch (error) {
      console.error('Error fetching owner NFTs from database:', error);
      toast.error('Failed to fetch owner NFTs');
    } finally {
      setOwnerNftsLoading(false);
    }
  };

  // Transfer NFT to strategy contract using executeExternalCall
  const handleTransferToStrategy = async (tokenId: string) => {
    if (!isConnected || !address || !collectionData?.strategy_address || !walletClient) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setProposingAuction(tokenId);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      console.log('Transferring NFT to strategy:', {
        tokenId,
        from: collectionData.token_address, // Token contract owns the NFT
        to: collectionData.strategy_address,
        nftContract: collectionData.collection_owner
      });

      toast.loading('Transferring NFT to strategy contract...', { id: 'transfer-nft' });

      // Create safeTransferFrom calldata
      const transferCalldata = encodeFunctionData({
        abi: [{
          name: 'safeTransferFrom',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' }
          ],
          outputs: []
        }],
        functionName: 'safeTransferFrom',
        args: [
          collectionData.token_address as `0x${string}`,      // from (token contract owns it)
          collectionData.strategy_address as `0x${string}`,   // to (strategy will own it)
          BigInt(tokenId)                                     // tokenId
        ]
      });

      // Execute transfer via token contract's executeExternalCall
      const hash = await walletClient.writeContract({
        address: collectionData.token_address as `0x${string}`,
        abi: [{
          name: 'executeExternalCall',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'target', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'data', type: 'bytes' }
          ],
          outputs: [{ name: '', type: 'bytes' }]
        }],
        functionName: 'executeExternalCall',
        args: [
          collectionData.collection_owner as `0x${string}`,  // NFT contract
          BigInt(0),                                         // value
          transferCalldata                                   // calldata
        ],
        account: address
      });

      console.log('Transfer transaction submitted:', hash);
      toast.loading('Waiting for transfer confirmation...', { id: 'transfer-nft' });

      const receipt = await client.waitForTransactionReceipt({ hash });

      if (receipt.status !== 'success') {
        throw new Error('Transfer transaction failed');
      }

      toast.success(`NFT #${tokenId} transferred to strategy contract!`, { id: 'transfer-nft' });

      // Update ownership status
      setNftOwnership(prev => ({
        ...prev,
        [tokenId]: 'strategy'
      }));

    } catch (error: any) {
      console.error('Error transferring NFT:', error);
      toast.dismiss('transfer-nft');

      // Handle user rejection gracefully
      if (error.message?.includes('User rejected') ||
        error.message?.includes('User denied') ||
        error.message?.includes('User rejected the request') ||
        error.message?.includes('MetaMask Tx Signature: User denied transaction signature')) {
        toast.info('Transaction cancelled. You cancelled the transaction. No changes were made.');
      } else {
        toast.error(`Failed to transfer NFT: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setProposingAuction(null);
    }
  };

  // Propose auction for an NFT
  const handleProposeAuction = async (tokenId: string, startPrice: string, endPrice: string) => {
    if (!isConnected || !address || !collectionData?.strategy_address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      setProposingAuction(tokenId);

      const chainConfig = Object.values(chainConfigs).find(c => c.id === collectionData.chain_id);
      if (!chainConfig?.rpcUrl) {
        throw new Error(`No RPC URL found for chain ID ${collectionData.chain_id}`);
      }

      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      // Convert prices to wei (assuming 18 decimals for token)
      const startPriceWei = parseEther(startPrice);
      const endPriceWei = parseEther(endPrice);

      console.log('Proposing auction:', {
        tokenId,
        startPrice: startPriceWei.toString(),
        endPrice: endPriceWei.toString(),
        strategyAddress: collectionData.strategy_address
      });

      // Check if NFT is in strategy contract
      const erc721Abi = [
        {
          name: 'ownerOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          outputs: [{ name: 'owner', type: 'address' }],
        }
      ] as const;

      const nftOwner = await client.readContract({
        address: collectionData.collection_owner as `0x${string}`, // Use NFT contract address
        abi: erc721Abi,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      });

      if (nftOwner.toLowerCase() !== collectionData.strategy_address.toLowerCase()) {
        throw new Error('NFT must be transferred to strategy contract first');
      }

      // Check for existing auction
      const auction = await client.readContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'auctions',
        args: [BigInt(tokenId)],
      });

      if (auction[0]) { // auction.active
        throw new Error('NFT already has an active auction');
      }

      // Check for pending proposals
      const hasPending = await client.readContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'hasPendingProposal',
        args: [BigInt(tokenId)],
      });

      if (hasPending) {
        throw new Error('NFT already has a pending proposal');
      }

      // Propose auction
      toast.loading('Submitting auction proposal...', { id: 'propose-auction' });

      const hash = await walletClient.writeContract({
        address: collectionData.strategy_address as `0x${string}`,
        abi: STRATEGY_ABI,
        functionName: 'proposeAuction',
        args: [BigInt(tokenId), startPriceWei, endPriceWei],
        account: address,
      });

      console.log('Proposal transaction submitted:', hash);
      toast.loading('Waiting for confirmation...', { id: 'propose-auction' });

      const receipt = await client.waitForTransactionReceipt({ hash });

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      toast.success(`Auction proposal submitted for NFT #${tokenId}!`, { id: 'propose-auction' });

      // Close modal and refresh
      setProposalModal({
        isOpen: false,
        tokenId: null,
        startPrice: '',
        endPrice: ''
      });

      // Refresh owner NFTs
      await fetchOwnerNFTs();

    } catch (error: any) {
      console.error('Error proposing auction:', error);
      toast.dismiss('propose-auction');

      // Handle user rejection gracefully
      if (error.message?.includes('User rejected') ||
        error.message?.includes('User denied') ||
        error.message?.includes('User rejected the request') ||
        error.message?.includes('MetaMask Tx Signature: User denied transaction signature')) {
        toast.info('Transaction cancelled. You cancelled the transaction. No changes were made.');
      } else {
        toast.error(`Failed to propose auction: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setProposingAuction(null);
    }
  };

  // Buy NFT at floor price
  const handleBuyFloorNFT = async () => {
    console.log('?? Buy button clicked!');
    console.log('Prerequisites check:', {
      hasFloorListing: !!floorListing,
      hasCollectionData: !!collectionData,
      hasWalletClient: !!walletClient,
      hasAddress: !!address,
      hasPublicClient: !!publicClient
    });

    if (!floorListing || !collectionData || !walletClient || !address || !publicClient) {
      console.error('? Missing required data:', {
        floorListing: !!floorListing,
        collectionData: !!collectionData,
        walletClient: !!walletClient,
        address: !!address,
        publicClient: !!publicClient
      });
      return;
    }

    const marketplace = floorListing.marketplace || getMarketplace(collectionData.chain_id);
    console.log('?? Marketplace:', marketplace);

    try {
      setBuyingNFT(true);
      setBuyError(null);

      // Check contract balance
      let contractBalance: bigint;

      // For Taiko chain (167000), fetch TAIKO token balance instead of native balance
      if (collectionData.chain_id === 167000) {
        const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975";
        contractBalance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [collectionData.token_address as `0x${string}`]
        });
      } else {
        // For other chains, fetch native currency balance
        contractBalance = await publicClient.getBalance({
          address: collectionData.token_address as `0x${string}`
        });
      }

      if (contractBalance < floorListing.priceWei) {
        throw new Error(
          `Insufficient funds: needs ${formatUnits(floorListing.priceWei, 18)} ${floorListing.currency}, available ${formatUnits(contractBalance, 18)}`
        );
      }

      if (marketplace === 'magiceden') {
        // Magic Eden purchase flow
        console.log('?? Preparing Magic Eden purchase...');
        console.log('Purchase params:', {
          contract: floorListing.nftContractAddress,
          tokenId: floorListing.tokenId,
          taker: collectionData.token_address,
        });

        const buyResponse = await fetch('/api/magiceden/buy', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            contract: floorListing.nftContractAddress,
            tokenId: floorListing.tokenId,
            taker: collectionData.token_address, // Payment contract is the buyer
          }),
        });

        console.log('?? Buy API response status:', buyResponse.status);

        if (!buyResponse.ok) {
          const errorData = await buyResponse.json();
          throw new Error(errorData.error || `Failed to prepare buy transaction: ${buyResponse.status}`);
        }

        const buyData = await buyResponse.json();

        if (!buyData.success || !buyData.transactions || buyData.transactions.length === 0) {
          throw new Error('Invalid transaction data received from Magic Eden');
        }

        console.log('?? Got transaction data from Magic Eden:', buyData);

        // Execute each transaction via executeExternalCall
        for (const tx of buyData.transactions) {
          console.log('Executing Magic Eden transaction:', {
            to: tx.to,
            value: tx.value,
            tokenAddress: collectionData.token_address
          });

          const hash = await walletClient.writeContract({
            address: collectionData.token_address as `0x${string}`,
            abi: [{
              name: 'executeExternalCall',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'target', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'data', type: 'bytes' }
              ],
              outputs: [{ name: '', type: 'bytes' }]
            }],
            functionName: 'executeExternalCall',
            args: [
              tx.to as `0x${string}`,
              BigInt(tx.value || '0'),
              tx.data as `0x${string}`
            ],
            account: address,
            gas: 1000000n
          });

          console.log('Purchase transaction submitted:', hash);

          // Wait for confirmation
          const receipt = await publicClient.waitForTransactionReceipt({ hash });

          if (receipt.status !== 'success') {
            throw new Error('Transaction failed');
          }
        }

        toast.success(`Success! NFT purchased for ${formatUnits(floorListing.priceWei, 18)} ${floorListing.currency} on Magic Eden`);

        // Save purchased token ID to database
        try {
          await fetch(`/api/collections/${collectionData.token_symbol}/nfts`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              tokenId: floorListing.tokenId,
              marketplace: 'magiceden',
            }),
          });
          console.log(`? Saved token #${floorListing.tokenId} to database`);
        } catch (dbError) {
          console.error('Failed to save token to database:', dbError);
        }

      } else if (marketplace === 'okidori') {
        // Okidori purchase flow
        console.log('🎯 Preparing Okidori purchase...');
        console.log('Purchase params:', {
          contract: floorListing.nftContractAddress,
          tokenId: floorListing.tokenId,
          buyer: collectionData.token_address,
        });

        const buyResponse = await fetch('/api/okidori/buy', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            contract: floorListing.nftContractAddress,
            tokenId: floorListing.tokenId,
            buyer: collectionData.token_address, // Payment contract is the buyer
          }),
        });

        console.log('🎯 Buy API response status:', buyResponse.status);

        if (!buyResponse.ok) {
          const errorData = await buyResponse.json();
          throw new Error(errorData.error || `Failed to prepare buy transaction: ${buyResponse.status}`);
        }

        const buyData = await buyResponse.json();

        if (!buyData.success || !buyData.transactions || buyData.transactions.length === 0) {
          throw new Error('Invalid transaction data received from Okidori');
        }

        console.log('🎯 Got transaction data from Okidori:', buyData);

        // Execute each transaction via executeExternalCall
        for (const tx of buyData.transactions) {
          // For approve transaction, check allowance first
          if (tx.type === 'approve' && tx.checkAllowance) {
            const currentAllowance = await publicClient.readContract({
              address: tx.to as `0x${string}`,
              abi: tx.checkAllowance.abi,
              functionName: tx.checkAllowance.functionName,
              args: tx.checkAllowance.args as any,
            }) as bigint;

            console.log('Current allowance:', currentAllowance.toString(), 'Required:', tx.checkAllowance.requiredAmount);

            if (currentAllowance >= BigInt(tx.checkAllowance.requiredAmount)) {
              console.log('✅ Allowance sufficient, skipping approve');
              continue;
            }
          }

          // Encode the function call
          const callData = encodeFunctionData({
            abi: tx.abi,
            functionName: tx.functionName,
            args: tx.args
          });

          console.log('Executing Okidori transaction:', {
            type: tx.type,
            to: tx.to,
            value: tx.value,
            tokenAddress: collectionData.token_address
          });

          const hash = await walletClient.writeContract({
            address: collectionData.token_address as `0x${string}`,
            abi: [{
              name: 'executeExternalCall',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'target', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'data', type: 'bytes' }
              ],
              outputs: [{ name: '', type: 'bytes' }]
            }],
            functionName: 'executeExternalCall',
            args: [
              tx.to as `0x${string}`,
              BigInt(tx.value || '0'),
              callData as `0x${string}`
            ],
            account: address,
            gas: 1000000n
          });

          console.log(`${tx.type} transaction submitted:`, hash);

          // Wait for confirmation
          const receipt = await publicClient.waitForTransactionReceipt({ hash });

          if (receipt.status !== 'success') {
            throw new Error(`${tx.type} transaction failed`);
          }

          console.log(`✅ ${tx.type} transaction confirmed`);
        }

        toast.success(`Success! NFT purchased for ${formatUnits(floorListing.priceWei, 18)} ${floorListing.currency} on Okidori`);

        // Save purchased token ID to database
        try {
          await fetch(`/api/collections/${collectionData.token_symbol}/nfts`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              tokenId: floorListing.tokenId,
              marketplace: 'okidori',
            }),
          });
          console.log(`🎯 Saved token #${floorListing.tokenId} to database`);
        } catch (dbError) {
          console.error('Failed to save token to database:', dbError);
        }

      } else {
        // OpenSea purchase flow (original code)
        console.log('?? Generating OpenSea fulfillment data...');

        const fulfillmentResponse = await fetch('/api/fulfillment-data', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            orderHash: floorListing.order_hash,
            chain: getOpenSeaChainName(collectionData.chain_id),
            protocolAddress: floorListing.protocol_address || '0x0000000000000068F116a894984e2DB1123eB395',
            fulfillerAddress: collectionData.token_address,
          }),
        });

        if (!fulfillmentResponse.ok) {
          const errorData = await fulfillmentResponse.json();
          throw new Error(errorData.error || `Failed to generate fulfillment data: ${fulfillmentResponse.status}`);
        }

        const fulfillmentJson = await fulfillmentResponse.json();

        if (!fulfillmentJson.success || !fulfillmentJson.fulfillmentData) {
          throw new Error('Invalid fulfillment data received');
        }

        const txData = fulfillmentJson.fulfillmentData.transaction;

        if (!txData?.to || !txData?.input_data) {
          throw new Error('Invalid fulfillment data');
        }

        // Encode the calldata using viem
        const params = txData.input_data.parameters;
        params.additionalRecipients = params.additionalRecipients.map((r: any) => [r.amount, r.recipient]);

        const callData = encodeFunctionData({
          abi: [{
            name: 'fulfillBasicOrder_efficient_6GL6yc',
            type: 'function',
            stateMutability: 'payable',
            inputs: [{
              name: 'parameters',
              type: 'tuple',
              components: [
                { name: 'considerationToken', type: 'address' },
                { name: 'considerationIdentifier', type: 'uint256' },
                { name: 'considerationAmount', type: 'uint256' },
                { name: 'offerer', type: 'address' },
                { name: 'zone', type: 'address' },
                { name: 'offerToken', type: 'address' },
                { name: 'offerIdentifier', type: 'uint256' },
                { name: 'offerAmount', type: 'uint256' },
                { name: 'basicOrderType', type: 'uint8' },
                { name: 'startTime', type: 'uint256' },
                { name: 'endTime', type: 'uint256' },
                { name: 'zoneHash', type: 'bytes32' },
                { name: 'salt', type: 'uint256' },
                { name: 'offererConduitKey', type: 'bytes32' },
                { name: 'fulfillerConduitKey', type: 'bytes32' },
                { name: 'totalOriginalAdditionalRecipients', type: 'uint256' },
                {
                  name: 'additionalRecipients', type: 'tuple[]', components: [
                    { name: 'amount', type: 'uint256' },
                    { name: 'recipient', type: 'address' }
                  ]
                },
                { name: 'signature', type: 'bytes' }
              ]
            }],
            outputs: [{ name: '', type: 'bool' }]
          }],
          functionName: 'fulfillBasicOrder_efficient_6GL6yc',
          args: [params]
        });

        const target = txData.to;
        const value = BigInt(txData.value || floorListing.priceWei);

        console.log('Executing OpenSea purchase via contract:', {
          target,
          value: value.toString(),
          tokenAddress: collectionData.token_address
        });

        // Execute via payment contract's executeExternalCall
        const hash = await walletClient.writeContract({
          address: collectionData.token_address as `0x${string}`,
          abi: [{
            name: 'executeExternalCall',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'target', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'data', type: 'bytes' }
            ],
            outputs: [{ name: '', type: 'bytes' }]
          }],
          functionName: 'executeExternalCall',
          args: [target as `0x${string}`, value, callData],
          account: address,
          gas: 800000n
        });

        console.log('Purchase transaction submitted:', hash);

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status !== 'success') {
          throw new Error('Transaction failed');
        }

        toast.success(`Success! NFT purchased for ${formatUnits(floorListing.priceWei, 18)} ${floorListing.currency} on OpenSea`);

        // Save purchased token ID to database
        try {
          await fetch(`/api/collections/${collectionData.token_symbol}/nfts`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              tokenId: floorListing.tokenId,
              marketplace: 'opensea',
            }),
          });
          console.log(`? Saved token #${floorListing.tokenId} to database`);
        } catch (dbError) {
          console.error('Failed to save token to database:', dbError);
        }
      }

      // Refresh listings
      await fetchFloorListing();

      // Refresh NFTs
      if (collectionData.token_address) {
        await fetchNFTBalance(collectionData.token_address, collectionData);
      }

    } catch (error: any) {
      console.error('Buy error:', error);
      const errorMessage = error?.message || '';

      const isUserRejection =
        errorMessage.includes('User rejected') ||
        errorMessage.includes('user rejected') ||
        errorMessage.includes('User denied') ||
        errorMessage.includes('User rejected the request') ||
        errorMessage.includes('MetaMask Tx Signature: User denied transaction signature') ||
        error?.code === 4001;

      if (isUserRejection) {
        toast.info('Transaction cancelled. You cancelled the transaction. No changes were made.');
      } else {
        setBuyError(error instanceof Error ? error.message : 'Failed to buy NFT');
        toast.error(`Purchase Failed: ${error instanceof Error ? error.message : 'Failed to buy NFT'}`);
      }
    } finally {
      setBuyingNFT(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <BidBopHeader />
        <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent animate-pulse">
                  Loading Collection
                </h2>
                <div className="flex items-center justify-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 ml-3">Fetching NFT data...</span>
                </div>
              </div>
              <div className="w-64 mx-auto">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Preparing your collection view...</p>
              </div>
            </div>
          </div>
        </main>
        <BidBopFooter />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <BidBopHeader />
        <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">??</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Collection Not Found</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/')} className="bg-purple-600 hover:bg-purple-700">
                Back to Home
              </Button>
            </div>
          </div>
        </main>
        <BidBopFooter />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
      : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/30'
      }`}>
      <BidBopHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 space-y-10">
        <header className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <h1 className={`text-4xl md:text-5xl font-bold bg-clip-text text-transparent transition-colors duration-300 ${isDarkMode
              ? 'bg-gradient-to-r from-slate-100 via-purple-100 to-slate-100'
              : 'bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900'
              }`}>
              {collectionData?.collection_name || slug}
            </h1>
            <p className={`text-lg transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>Advanced Trading & Auction Platform</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200">
              {collectionData?.network_name || 'UpFloor'}
            </Badge>
            <Button variant="outline" onClick={() => router.push(`/browse`)} className="border-slate-200 hover:bg-slate-50">
               Back to Browse
            </Button>
          </div>
        </header>

        <section
          className="relative overflow-hidden rounded-2xl p-6 md:p-8"
          style={{
            backgroundImage: "linear-gradient(135deg, #651bcf 0%, #651bcf 55%, #651bcf 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full blur-3xl opacity-30"
            style={{
              background: "radial-gradient(closest-side, rgba(212,7,239,0.6), transparent 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full blur-3xl opacity-25"
            style={{
              background: "radial-gradient(closest-side, rgba(1,242,190,0.6), transparent 70%)",
            }}
          />
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/15 text-white">{collectionData?.token_symbol || 'Strategy'}</Badge>
                <Badge className="bg-black/20 text-white">{collectionData?.network_name || 'UpFloor'}</Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold">
                Trade {collectionData?.collection_name || slug}
              </h2>
              <p className="mt-1 text-white/85 text-sm">
                Buy and sell {collectionData?.token_symbol || 'strategy'} tokens and NFTs.
              </p>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Floor Price</div>
                  <div className="text-white font-semibold">
                    {collectionData?.floor_price ? formatWeiToEth(collectionData.floor_price) + ` ${getCurrencySymbol(collectionData?.chain_id || 1)}` : 'N/A'}
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Market Cap</div>
                  <div className="text-white font-semibold">
                    {collectionData?.market_cap ? formatMarketCap(collectionData.market_cap, collectionData?.chain_id || 1) : 'N/A'}
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Total Supply</div>
                  <div className="text-white font-semibold">
                    {collectionData?.total_supply || 'N/A'}
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Listed / Supply</div>
                  <div className="text-white font-semibold">
                    {collectionData?.listed_count !== undefined && collectionData?.total_supply !== undefined
                      ? `${collectionData.listed_count} / ${collectionData.total_supply}`
                      : 'N/A'}
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-white/70 text-xs">Contract Balance</div>
                  <div className="text-white font-semibold">
                    {contractBalanceLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : contractBalance !== null ? (
                      `${contractBalance.toFixed(4)} ${getCurrencySymbol(collectionData?.chain_id || 1)}`
                    ) : (
                      'N/A'
                    )}
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className={`transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/30 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  onClick={() => collectionData?.website && window.open(collectionData.website, '_blank')}
                  disabled={!collectionData?.website}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                  </svg>
                  Website
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/30 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  onClick={() => collectionData?.twitter && window.open(collectionData.twitter.startsWith('http') ? collectionData.twitter : `https://twitter.com/${collectionData.twitter}`, '_blank')}
                  disabled={!collectionData?.twitter}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/30 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  onClick={() => collectionData?.discord && window.open(collectionData.discord, '_blank')}
                  disabled={!collectionData?.discord}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Discord
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/30 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  onClick={() => collectionData?.opensea_slug && window.open(`https://opensea.io/collection/${collectionData.opensea_slug}`, '_blank')}
                  disabled={!collectionData?.opensea_slug}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  OpenSea
                </Button>
              </div>

              {/* Trade Button */}
              <div className="mt-5 flex items-center gap-3">
                <Button
                  className="text-white border border-white/30"
                  onClick={openTradeModal}
                  disabled={!isConnected}
                  style={{ backgroundColor: '#651bcf' }}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isConnected ? 'Trade Tokens' : 'Connect Wallet to Trade'}
                </Button>
              </div>
            </div>

            <div className="md:col-span-1 flex justify-center">
              <div className="w-full max-w-sm p-4 bg-transparent">
                <img
                  src={img || "/placeholder.svg"}
                  alt={`${collectionData?.collection_name || slug} collection`}
                  className="w-full h-48 md:h-56 object-cover rounded-xl shadow-2xl bg-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="auctions" className="space-y-8">
          <TabsList className={`grid w-full grid-cols-4 p-1 rounded-xl transition-colors duration-300 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100/50'
            }`}>
            <TabsTrigger value="auctions" className={`rounded-lg font-medium transition-colors duration-300 ${isDarkMode
              ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-white'
              : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'
              }`}>
              Live Auctions
            </TabsTrigger>
            <TabsTrigger value="buy" className={`rounded-lg font-medium transition-colors duration-300 ${isDarkMode
              ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-white'
              : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'
              }`}>
              Floor Trading
            </TabsTrigger>
            <TabsTrigger value="list" className={`rounded-lg font-medium transition-colors duration-300 ${isDarkMode
              ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-white'
              : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'
              }`}>
              List NFTs
            </TabsTrigger>
            <TabsTrigger value="overview" className={`rounded-lg font-medium transition-colors duration-300 ${isDarkMode
              ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-white'
              : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'
              }`}>
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auctions" className="space-y-6">
            {auctionsLoading ? (
              <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/70 border-gray-700/60'
                : 'bg-white border border-gray-200'
                }`}>
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className={`ml-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Loading live auctions...</span>
                  </div>
                </CardContent>
              </Card>
            ) : activeAuctions.length === 0 ? (
              <Card className={`relative overflow-hidden shadow-2xl rounded-2xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800/30 border border-gray-700/50'
                : 'bg-gradient-to-br from-slate-50 via-white to-purple-50/30 border border-slate-200/50'
                }`}>
                <div className={`absolute inset-0 transition-colors duration-300 ${isDarkMode
                  ? 'bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10'
                  : 'bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5'
                  }`}></div>
                <CardContent className="relative p-12 text-center">
                  <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>Auction Market Dormant</h3>
                  <p className={`mb-8 max-w-md mx-auto leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                    }`}>
                    {(() => {
                      const marketplace = getMarketplace(collectionData?.chain_id);
                      if (marketplace === 'okidori') {
                        return 'The auction floor is currently quiet. No active listings detected on Okidori marketplace. Check the strategy contract for available auctions.';
                      }
                      return 'The auction floor is currently quiet. No active listings detected in this collection\'s marketplace.';
                    })()}
                  </p>
                  <Button
                    onClick={fetchActiveAuctions}
                    className="citrus-button px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Scan for Auctions
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>Active Auctions ({activeAuctions.length})</h3>
                  <Button
                    onClick={fetchActiveAuctions}
                    variant="outline"
                    size="sm"
                    disabled={auctionsLoading}
                  >
                    {auctionsLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                        Refreshing...
                      </div>
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activeAuctions.map((auction) => {
                    const currentPriceFormatted = formatUnits(BigInt(auction.currentPrice), 18);
                    const startPriceFormatted = formatUnits(BigInt(auction.startPrice), 18);
                    const endPriceFormatted = formatUnits(BigInt(auction.endPrice), 18);
                    const isAccepting = acceptingBid === auction.tokenId;

                    return (
                      <Card key={auction.tokenId} className={`hover:shadow-lg transition-all duration-300 hover:scale-105 ${isDarkMode
                        ? 'bg-gray-800/70 border-gray-700/60'
                        : 'bg-card/60'
                        }`}>
                        <CardHeader>
                          <CardTitle className={`text-base transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                            }`}>{collectionData?.collection_name} #{auction.tokenId}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className={`h-40 rounded-lg flex items-center justify-center overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/30' : 'bg-muted/30'
                            }`}>
                            <img
                              src={collectionData?.collection_image || img || "/placeholder.svg"}
                              alt={`${collectionData?.collection_name} #${auction.tokenId}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                                }
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                                }`}>Token ID:</span>
                              <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                }`}>{auction.tokenId}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                                }`}>Current Price:</span>
                              <span className="font-semibold text-green-600">
                                {parseFloat(currentPriceFormatted).toFixed(4)} {collectionData?.token_symbol}
                              </span>
                            </div>
                            <div className={`flex items-center justify-between text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                              }`}>
                              <span>Start: {parseFloat(startPriceFormatted).toFixed(4)}</span>
                              <span>End: {parseFloat(endPriceFormatted).toFixed(4)}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            {!isConnected ? (
                              <Button
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                                disabled
                              >
                                Connect Wallet to Buy
                              </Button>
                            ) : (
                              <Button
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                                onClick={() => handleAcceptBid(auction.tokenId)}
                                disabled={isAccepting}
                              >
                                {isAccepting ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Processing...
                                  </div>
                                ) : (
                                  `Buy Now for ${parseFloat(currentPriceFormatted).toFixed(4)} ${collectionData?.token_symbol}`
                                )}
                              </Button>
                            )}

                            {isConnected && (
                              <div className={`text-xs text-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                                }`}>
                                Your balance: {formatUnits(userTokenBalance, 18).slice(0, 8)} {collectionData?.token_symbol}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="buy" className="space-y-6">
            {(() => {
              const marketplace = getMarketplace(collectionData?.chain_id);
              // For Taiko chain (167000), check collection_owner instead of opensea_slug
              if (marketplace === 'okidori') {
                if (!collectionData?.collection_owner) {
                  return (
                    <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                      ? 'bg-gray-800/70 border-gray-700/60'
                      : 'bg-white border border-gray-200'
                      }`}>
                      <CardContent className="p-6 text-center">
                        <div className={`mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>??</div>
                        <h3 className={`font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>Okidori Not Configured</h3>
                        <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                          Add a collection owner (NFT contract address) to enable floor price purchases on Okidori.
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
              } else if (marketplace === 'opensea' && !collectionData?.opensea_slug) {
                return (
                  <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                    ? 'bg-gray-800/70 border-gray-700/60'
                    : 'bg-white border border-gray-200'
                    }`}>
                    <CardContent className="p-6 text-center">
                      <div className={`mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>??</div>
                      <h3 className={`font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>OpenSea Not Configured</h3>
                      <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                        Add an OpenSea slug to enable floor price purchases.
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })()}
            {(() => {
              const marketplace = getMarketplace(collectionData?.chain_id);
              // Only show loading if marketplace is configured
              const isConfigured =
                (marketplace === 'okidori' && collectionData?.collection_owner) ||
                (marketplace === 'opensea' && collectionData?.opensea_slug) ||
                (marketplace === 'magiceden' && collectionData?.collection_owner);

              if (!isConfigured) return null;
            })()}
            {loadingFloorPrice ? (
              <Card className={`relative overflow-hidden shadow-xl rounded-2xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800/50 border border-purple-700/50'
                : 'bg-gradient-to-br from-purple-50 via-white to-purple-50/50 border border-purple-100/50'
                }`}>
                <CardContent className="p-12 text-center relative z-10">
                  {/* Animated background gradient */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-200 rounded-full filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-200 rounded-full filter blur-xl animate-blob animation-delay-4000"></div>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-8 relative">
                    {/* Cool NFT card loading animation */}
                    <div className="relative">
                      {/* Rotating glow effect */}
                      <div className="absolute inset-0 bg-purple-200 rounded-2xl blur-2xl opacity-60 animate-pulse"></div>

                      {/* Main card */}
                      <div className="relative bg-gradient-to-br from-purple-400 to-purple-500 p-8 rounded-2xl transform hover:scale-105 transition-transform duration-300">
                        {/* Scanning line animation */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl">
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-transparent opacity-20 animate-scan"></div>
                        </div>

                        {/* NFT Icon */}
                        <div className="relative z-10">
                          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 animate-float">
                            <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>

                          {/* Loading dots */}
                          <div className="flex justify-center space-x-2">
                            <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Text content */}
                    <div className="space-y-3">
                      <h3 className={`text-2xl font-bold animate-pulse transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                        Scanning Floor Price
                      </h3>
                      <p className={`text-sm max-w-md transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                        {(() => {
                          const marketplace = getMarketplace(collectionData?.chain_id);
                          if (marketplace === 'magiceden') return 'Searching Magic Eden for the best deal on this collection';
                          if (marketplace === 'okidori') return 'Searching Okidori for the best deal on this collection';
                          return 'Searching OpenSea for the best deal on this collection';
                        })()}
                      </p>

                      {/* Progress indicators */}
                      <div className={`flex items-center justify-center gap-2 text-xs mt-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        <div className="flex items-center gap-1 opacity-100 transition-opacity">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
                          <span>
                            {(() => {
                              const marketplace = getMarketplace(collectionData?.chain_id);
                              if (marketplace === 'magiceden') return 'Connecting to Magic Eden';
                              if (marketplace === 'okidori') return 'Connecting to Okidori';
                              return 'Connecting to OpenSea';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : buyError ? (
              <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/70 border-red-700/60'
                : 'bg-white border border-red-200'
                }`}>
                <CardContent className="p-6 text-center">
                  <div className="text-red-500 mb-2">??</div>
                  <h3 className={`font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>Error Loading Listings</h3>
                  <p className={`text-sm mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>{buyError}</p>
                  <Button
                    onClick={fetchFloorListing}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                  >
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : !floorListing ? (
              <Card className={`relative overflow-hidden shadow-2xl rounded-2xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800/30 border border-slate-700/50'
                : 'bg-gradient-to-br from-slate-50 via-white to-purple-50/30 border border-slate-200/50'
                }`}>
                <div className={`absolute inset-0 transition-colors duration-300 ${isDarkMode
                  ? 'bg-gradient-to-br from-purple-500/10 via-transparent to-teal-500/10'
                  : 'bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5'
                  }`}></div>
                <CardContent className="relative p-12 text-center">
                  <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>Floor Price Discovery</h3>
                  <p className={`mb-8 max-w-md mx-auto leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                    }`}>
                    {(() => {
                      const marketplace = getMarketplace(collectionData?.chain_id);
                      if (marketplace === 'magiceden') return 'Access the most competitive pricing on Magic Eden. Discover the optimal entry point for this collection.';
                      if (marketplace === 'okidori') return 'Access the most competitive pricing on Okidori. Discover the optimal entry point for this collection.';
                      return 'Access the most competitive pricing on OpenSea. Discover the optimal entry point for this collection.';
                    })()}
                  </p>
                  <Button
                    onClick={fetchFloorListing}
                    className="bg-gradient-to-r from-purple-600 via-blue-500 to-teal-500 hover:from-purple-500 hover:via-blue-400 hover:to-teal-400 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Discover Floor Price
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Header with refresh button */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-teal-400 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                      <div className="relative p-4 bg-gradient-to-br from-purple-600 via-blue-500 to-teal-500 rounded-2xl shadow-xl">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className={`text-3xl font-bold bg-clip-text text-transparent transition-colors duration-300 ${isDarkMode
                        ? 'bg-gradient-to-r from-slate-100 via-purple-400 to-slate-100'
                        : 'bg-gradient-to-r from-slate-900 via-purple-600 to-slate-900'
                        }`}>
                        Floor Price Discovery
                      </h3>
                      <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                        }`}>
                        {(() => {
                          const marketplace = floorListing.marketplace || getMarketplace(collectionData?.chain_id);
                          if (marketplace === 'magiceden') return 'Optimal entry point on Magic Eden';
                          if (marketplace === 'okidori') return 'Optimal entry point on Okidori';
                          return 'Optimal entry point on OpenSea';
                        })()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFloorListing}
                    disabled={loadingFloorPrice}
                    className="border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Market Data
                  </Button>
                </div>

                {/* Main NFT Card */}
                <Card className={`relative overflow-hidden border-2 shadow-2xl rounded-2xl transition-colors duration-300 ${isDarkMode
                  ? 'bg-gradient-to-br from-gray-800 via-gray-700/30 to-gray-800/30 border-purple-700/50'
                  : 'bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 border-purple-200/50'
                  }`}>
                  {/* Decorative gradient background */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>

                  <CardContent className="p-8 relative z-10">
                    {/* NFT Preview Section */}
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
                      {/* NFT Image */}
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-teal-400 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                        <div className="relative w-56 h-56 rounded-2xl bg-gradient-to-br from-purple-500 to-teal-400 overflow-hidden border-4 border-white shadow-2xl">
                          <img
                            src={(() => {
                              // Debug logging
                              console.log('??? Image source selection:', {
                                marketplace: floorListing.marketplace,
                                rawDataTokenImage: floorListing.rawData?.token?.image,
                                collectionImage: collectionData?.collection_image,
                                fallbackImage: img
                              });

                              // Use NFT image from API response if available, fallback to collection image
                              if (floorListing.marketplace === 'magiceden') {
                                // Try multiple possible paths for the image
                                const imageUrl = floorListing.rawData?.token?.image ||
                                  floorListing.rawData?.criteria?.data?.token?.image ||
                                  floorListing.rawData?.image;

                                if (imageUrl) {
                                  console.log('? Using Magic Eden NFT image:', imageUrl);
                                  return imageUrl;
                                } else {
                                  console.log('?? No image found in Magic Eden rawData:', floorListing.rawData);
                                }
                              }

                              if (floorListing.marketplace === 'okidori') {
                                // Okidori image paths
                                const imageUrl = floorListing.rawData?.nft?.image ||
                                  floorListing.rawData?.image;

                                if (imageUrl) {
                                  console.log('🎯 Using Okidori NFT image:', imageUrl);
                                  return imageUrl;
                                } else {
                                  console.log('⚠️ No image found in Okidori rawData:', floorListing.rawData);
                                }
                              }

                              if (floorListing.marketplace === 'opensea' && floorListing.protocol_data?.nftContractAddress) {
                                console.log('? Using OpenSea NFT image (placeholder for now)');
                                return collectionData?.collection_image || img || "/placeholder.svg";
                              }

                              console.log('?? Using fallback image');
                              return collectionData?.collection_image || img || "/placeholder.svg";
                            })()}
                            alt={`${collectionData?.collection_name} #${floorListing.tokenId}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-100 to-slate-200"><svg class="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                              }
                            }}
                          />
                        </div>
                        {/* Badge */}
                        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border-2 border-white">
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            FLOOR
                          </div>
                        </div>
                      </div>

                      {/* NFT Details */}
                      <div className="flex-1 space-y-6">
                        <div>
                          <h4 className={`text-4xl font-bold bg-clip-text text-transparent mb-2 transition-colors duration-300 ${isDarkMode
                            ? 'bg-gradient-to-r from-slate-100 via-purple-400 to-slate-100'
                            : 'bg-gradient-to-r from-slate-900 via-purple-600 to-slate-900'
                            }`}>
                            {collectionData?.collection_name} #{floorListing.tokenId}
                          </h4>
                          <p className={`text-lg mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                            }`}>
                            {(() => {
                              if (floorListing.marketplace === 'magiceden') {
                                const nftName = floorListing.rawData?.token?.name ||
                                  floorListing.rawData?.criteria?.data?.token?.name;
                                if (nftName) {
                                  console.log('? Using Magic Eden NFT name:', nftName);
                                  return nftName;
                                } else {
                                  console.log('?? No name found in Magic Eden rawData');
                                }
                              }
                              if (floorListing.marketplace === 'okidori') {
                                const nftName = floorListing.rawData?.nft?.name ||
                                  floorListing.rawData?.name;
                                if (nftName) {
                                  console.log('🎯 Using Okidori NFT name:', nftName);
                                  return nftName;
                                } else {
                                  console.log('⚠️ No name found in Okidori rawData');
                                }
                              }
                              return `Premium NFT from ${collectionData?.collection_name} collection`;
                            })()}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <span className="px-4 py-2 bg-gradient-to-r from-purple-100 to-teal-100 text-purple-800 rounded-xl text-sm font-semibold border border-purple-200">
                              Token #{floorListing.tokenId}
                            </span>
                            <span className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-xl text-sm font-semibold border border-slate-200">
                              {floorListing.nftContractAddress.slice(0, 6)}...{floorListing.nftContractAddress.slice(-4)}
                            </span>
                            <span className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-xl text-sm font-semibold border border-purple-200">
                              {floorListing.marketplace === 'magiceden' ? 'Magic Eden' : floorListing.marketplace === 'okidori' ? 'Okidori' : 'OpenSea'}
                            </span>
                          </div>
                        </div>

                        {/* Price Display - Large and prominent */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-teal-400 rounded-2xl blur-lg opacity-20"></div>
                          <div className="relative bg-gradient-to-r from-purple-600 via-blue-500 to-teal-500 p-8 rounded-2xl text-white shadow-2xl border border-white/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-lg font-semibold opacity-90">Current Floor Price</div>
                              <div className="flex items-center gap-1 text-sm opacity-80">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Live Price
                              </div>
                            </div>
                            <div className="text-5xl font-bold flex items-baseline gap-3">
                              {formatUnits(floorListing.priceWei, 18)}
                              <span className="text-3xl opacity-90 font-semibold">{floorListing.currency}</span>
                            </div>
                            <div className="mt-3 text-sm opacity-80">
                              Best available price on {(() => {
                                const marketplace = floorListing.marketplace || getMarketplace(collectionData?.chain_id);
                                if (marketplace === 'magiceden') return 'Magic Eden';
                                if (marketplace === 'okidori') return 'Okidori';
                                return 'OpenSea';
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className={`backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${isDarkMode
                        ? 'bg-gray-800/90 border border-gray-700/50'
                        : 'bg-white/90 border border-slate-200/50'
                        }`}>
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-purple-100 to-teal-100 rounded-xl">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                              }`}>Contract Balance</div>
                            <div className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-900'
                              }`}>
                              {contractBalance !== null ? `${contractBalance.toFixed(4)} ${getCurrencySymbol(collectionData?.chain_id)}` : 'Loading...'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={`backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${isDarkMode
                        ? 'bg-gray-800/90 border border-gray-700/50'
                        : 'bg-white/90 border border-slate-200/50'
                        }`}>
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                              }`}>Network</div>
                            <div className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-900'
                              }`}>
                              {collectionData?.network_name || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={`backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${isDarkMode
                        ? 'bg-gray-800/90 border border-gray-700/50'
                        : 'bg-white/90 border border-slate-200/50'
                        }`}>
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                              }`}>Marketplace</div>
                            <div className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-900'
                              }`}>
                              {floorListing.marketplace === 'magiceden' ? 'Magic Eden' : floorListing.marketplace === 'okidori' ? 'Okidori' : 'OpenSea'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Listing Expiration */}
                    <div className={`border-2 rounded-xl p-4 mb-6 transition-colors duration-300 ${isDarkMode
                      ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-700/50'
                      : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200/50'
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-yellow-200' : 'text-yellow-900'
                            }`}>Listing Expires</div>
                          <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                            }`}>
                            {floorListing.marketplace === 'magiceden' || floorListing.marketplace === 'okidori'
                              ? new Date(Number(floorListing.validUntil) * 1000).toLocaleString()
                              : new Date(Number(floorListing.protocol_data.parameters.endTime) * 1000).toLocaleString()
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Buy Button */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-teal-400 rounded-3xl blur-2xl opacity-20"></div>
                      <Button
                        onClick={() => {
                          console.log('?? Buy button onClick fired');
                          console.log('Button state:', {
                            buyingNFT,
                            isConnected,
                            contractBalance,
                            floorPriceWei: floorListing.priceWei.toString(),
                            balanceWei: contractBalance ? BigInt(Math.floor(contractBalance * 1e18)).toString() : 'null',
                            hasEnoughBalance: contractBalance !== null && BigInt(Math.floor(contractBalance * 1e18)) >= floorListing.priceWei
                          });
                          handleBuyFloorNFT();
                        }}
                        disabled={buyingNFT || !isConnected || contractBalance === null || (contractBalance !== null && BigInt(Math.floor(contractBalance * 1e18)) < floorListing.priceWei)}
                        className="w-full relative group bg-gradient-to-r from-purple-600 via-blue-500 to-teal-500 hover:from-purple-500 hover:via-blue-400 hover:to-teal-400 text-white py-10 text-2xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-3xl border-2 border-white/20"
                      >
                        {buyingNFT ? (
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Executing Purchase...</span>
                          </div>
                        ) : !isConnected ? (
                          <div className="flex items-center justify-center gap-3">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Connect Wallet to Purchase
                          </div>
                        ) : contractBalance !== null && BigInt(Math.floor(contractBalance * 1e18)) < floorListing.priceWei ? (
                          <div className="flex items-center justify-center gap-3">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Insufficient Contract Balance
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <div className="text-center">
                              <div className="text-2xl font-bold">Purchase NFT</div>
                              <div className="text-lg opacity-90">{formatUnits(floorListing.priceWei, 18)} {floorListing.currency}</div>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-teal-400 rounded-3xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity"></div>
                      </Button>
                    </div>

                    {/* Info */}
                    <div className={`mt-6 border-2 rounded-xl p-6 transition-colors duration-300 ${isDarkMode
                      ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-700/50'
                      : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50'
                      }`}>
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-bold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-blue-200' : 'text-blue-900'
                            }`}>How it works</h4>
                          <ul className={`space-y-2 text-sm transition-colors duration-300 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'
                            }`}>
                            <li className="flex items-start gap-2">
                              <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Purchase made using contract's balance
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              NFT owned by payment contract
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              {(() => {
                                const marketplace = getMarketplace(collectionData?.chain_id);
                                if (marketplace === 'magiceden') return 'Powered by Magic Eden protocol';
                                if (marketplace === 'okidori') return 'Powered by Okidori marketplace';
                                return 'Powered by OpenSea Seaport protocol';
                              })()}
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            {ownerNftsLoading ? (
              <Card className={`shadow-lg rounded-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/70 border-gray-700/60'
                : 'bg-white border border-gray-200'
                }`}>
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className={`ml-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Loading owner NFTs...</span>
                  </div>
                </CardContent>
              </Card>
            ) : ownerNfts.length === 0 ? (
              <Card className={`relative overflow-hidden shadow-2xl rounded-2xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800/30 border border-slate-700/50'
                : 'bg-gradient-to-br from-slate-50 via-white to-orange-50/30 border border-slate-200/50'
                }`}>
                <div className={`absolute inset-0 transition-colors duration-300 ${isDarkMode
                  ? 'bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10'
                  : 'bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5'
                  }`}></div>
                <CardContent className="relative p-12 text-center">
                  <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>Strategy Vault Empty</h3>
                  <p className={`mb-8 max-w-md mx-auto leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                    }`}>
                    The strategy contract currently holds no NFTs available for auction listing.
                    Transfer assets to begin the listing process.
                  </p>
                  <Button
                    onClick={fetchOwnerNFTs}
                    className="citrus-button px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Inventory
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>NFTs Ready for Listing ({ownerNfts.length})</h3>
                  <Button
                    onClick={fetchOwnerNFTs}
                    variant="outline"
                    size="sm"
                    disabled={ownerNftsLoading}
                  >
                    {ownerNftsLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                        Refreshing...
                      </div>
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ownerNfts.map((nft) => {
                    const isProposing = proposingAuction === nft.id;

                    return (
                      <Card key={nft.id} className={`hover:shadow-lg transition-all duration-300 hover:scale-105 ${isDarkMode
                        ? 'bg-gray-800/70 border-gray-700/60'
                        : 'bg-card/60'
                        }`}>
                        <CardHeader>
                          <CardTitle className={`text-base transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                            }`}>{collectionData?.collection_name} #{nft.id}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className={`h-40 rounded-lg flex items-center justify-center overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/30' : 'bg-muted/30'
                            }`}>
                            <img
                              src={collectionData?.collection_image || img || "/placeholder.svg"}
                              alt={`${collectionData?.collection_name} #${nft.id}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                                }
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                                }`}>Token ID:</span>
                              <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                }`}>{nft.id}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                                }`}>Status:</span>
                              <span className={`font-semibold ${nftOwnership[nft.id] === 'strategy'
                                ? 'text-blue-600'
                                : 'text-orange-600'
                                }`}>
                                {nftOwnership[nft.id] === 'strategy' ? 'In Strategy' : 'Owned by Token Contract'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            {!isConnected ? (
                              <Button
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                                disabled
                              >
                                Connect Wallet to List
                              </Button>
                            ) : nftOwnership[nft.id] === 'user' ? (
                              <Button
                                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white"
                                onClick={() => handleTransferToStrategy(nft.id)}
                                disabled={proposingAuction === nft.id}
                              >
                                {proposingAuction === nft.id ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Transferring...
                                  </div>
                                ) : (
                                  'Transfer to Strategy'
                                )}
                              </Button>
                            ) : (
                              <Button
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
                                onClick={() => setProposalModal({
                                  isOpen: true,
                                  tokenId: nft.id,
                                  startPrice: '',
                                  endPrice: ''
                                })}
                                disabled={isProposing}
                              >
                                {isProposing ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Proposing...
                                  </div>
                                ) : (
                                  'Propose Auction'
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card className={`backdrop-blur-sm shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 ${isDarkMode
              ? 'bg-gray-800/80 border border-gray-700/50'
              : 'bg-white/80 border border-slate-200/50'
              }`}>
              <CardHeader className={`pb-6 backdrop-blur-sm transition-colors duration-300 ${isDarkMode
                ? 'bg-gradient-to-br from-gray-800/80 to-gray-700/30'
                : 'bg-gradient-to-br from-slate-50/80 to-purple-50/30'
                }`}>
                <CardTitle className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                  Market Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                    }`}>Floor</div>
                  <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                    {collectionData?.floor_price ? formatWeiToEth(collectionData.floor_price) + ` ${getCurrencySymbol(collectionData?.chain_id || 1)}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                    }`}>Market Cap</div>
                  <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                    {collectionData?.market_cap ? formatMarketCap(collectionData.market_cap, collectionData?.chain_id || 1) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                    }`}>Supply</div>
                  <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                    {collectionData?.total_supply || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                    }`}>Listed</div>
                  <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                    {collectionData?.listed_count !== undefined && collectionData?.total_supply !== undefined
                      ? `${collectionData.listed_count} / ${collectionData.total_supply}`
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                    }`}>Contract Balance</div>
                  <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                    {contractBalanceLoading ? (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : contractBalance !== null ? (
                      `${contractBalance.toFixed(4)} ${getCurrencySymbol(collectionData?.chain_id || 1)}`
                    ) : (
                      'N/A'
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`backdrop-blur-sm shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 ${isDarkMode
              ? 'bg-gray-800/80 border border-gray-700/50'
              : 'bg-white/80 border border-slate-200/50'
              }`}>
              <CardHeader className={`pb-6 backdrop-blur-sm transition-colors duration-300 ${isDarkMode
                ? 'bg-gradient-to-br from-gray-800/80 to-gray-700/30'
                : 'bg-gradient-to-br from-slate-50/80 to-blue-50/30'
                }`}>
                <CardTitle className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                  Contract Infrastructure
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                      }`}>Token Address</div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className={`truncate flex-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>{tokenAddress}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copy(tokenAddress)} className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                          }`}>
                          Copy
                        </Button>
                        {collectionData?.explorer_base_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`${collectionData.explorer_base_url}/address/${tokenAddress}`, '_blank')}
                            className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                              }`}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                      }`}>Strategy Address</div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className={`truncate flex-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>{strategyAddress}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copy(strategyAddress)} className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                          }`}>
                          Copy
                        </Button>
                        {collectionData?.explorer_base_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`${collectionData.explorer_base_url}/address/${strategyAddress}`, '_blank')}
                            className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                              }`}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {collectionData && (
                    <>
                      <div className="text-sm">
                        <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                          }`}>Deployment Transaction</div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className={`truncate flex-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
                            }`}>{collectionData.transaction_hash}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => copy(collectionData.transaction_hash)} className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                              }`}>
                              Copy
                            </Button>
                            {collectionData.explorer_base_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`${collectionData.explorer_base_url}/tx/${collectionData.transaction_hash}`, '_blank')}
                                className={`min-w-[60px] transition-all duration-300 ${isDarkMode ? 'hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/30 border-gray-600' : 'hover:bg-gray-100'
                                  }`}
                              >
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                          }`}>Deployed At</div>
                        <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                          {new Date(collectionData.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                          }`}>Block Number</div>
                        <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>{collectionData.block_number.toLocaleString()}</div>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'
                    }`}>Latest Activity</div>
                  <div className="space-y-2">
                    <div className={`flex items-center justify-between rounded-lg p-2 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/20' : 'bg-muted/20'
                      }`}>
                      <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>Collection Deployed</span>
                      <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>{new Date(collectionData?.created_at || '').toLocaleDateString()}</span>
                    </div>
                    {collectionData?.opensea_data_updated_at && (
                      <div className={`flex items-center justify-between rounded-lg p-2 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/20' : 'bg-muted/20'
                        }`}>
                        <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
                          }`}>Market Data Updated</span>
                        <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>{new Date(collectionData.opensea_data_updated_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className={`flex items-center justify-between rounded-lg p-2 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/20' : 'bg-muted/20'
                      }`}>
                      <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>Active Auctions</span>
                      <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>{activeAuctions.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>


      {/* Proposal Modal */}
      {proposalModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Propose Auction for NFT #{proposalModal.tokenId}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setProposalModal({
                    isOpen: false,
                    tokenId: null,
                    startPrice: '',
                    endPrice: ''
                  })}
                >
                  ?
                </Button>
              </div>

              <div className="space-y-4">
                <div className={`p-3 rounded-lg transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-lg">
                      <img
                        src={collectionData?.collection_image || img || "/placeholder.svg"}
                        alt="Collection"
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                        {collectionData?.collection_name} #{proposalModal.tokenId}
                      </h3>
                      <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {collectionData?.network_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                      Start Price ({collectionData?.token_symbol})
                    </Label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={proposalModal.startPrice}
                      onChange={(e) => setProposalModal(prev => ({ ...prev, startPrice: e.target.value }))}
                      className="mt-1"
                      step="0.001"
                      min="0"
                    />
                    <div className={`text-xs mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      Starting price in {collectionData?.token_symbol} tokens
                    </div>
                  </div>

                  <div>
                    <Label className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                      End Price ({collectionData?.token_symbol})
                    </Label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={proposalModal.endPrice}
                      onChange={(e) => setProposalModal(prev => ({ ...prev, endPrice: e.target.value }))}
                      className="mt-1"
                      step="0.001"
                      min="0"
                    />
                    <div className={`text-xs mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      Ending price in {collectionData?.token_symbol} tokens
                    </div>
                  </div>

                  {proposalModal.startPrice && proposalModal.endPrice && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700">Start Price:</span>
                          <span className="font-semibold text-blue-800">
                            {proposalModal.startPrice} {collectionData?.token_symbol}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700">End Price:</span>
                          <span className="font-semibold text-blue-800">
                            {proposalModal.endPrice} {collectionData?.token_symbol}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 mt-2">
                          The auction will start at the higher price and decrease to the lower price over time.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => setProposalModal({
                        isOpen: false,
                        tokenId: null,
                        startPrice: '',
                        endPrice: ''
                      })}
                      variant="outline"
                      className="flex-1"
                      disabled={proposingAuction === proposalModal.tokenId}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (proposalModal.tokenId && proposalModal.startPrice && proposalModal.endPrice) {
                          handleProposeAuction(proposalModal.tokenId, proposalModal.startPrice, proposalModal.endPrice);
                        }
                      }}
                      disabled={!proposalModal.startPrice || !proposalModal.endPrice || proposingAuction === proposalModal.tokenId}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      {proposingAuction === proposalModal.tokenId ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Proposing...
                        </div>
                      ) : (
                        'Propose Auction'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      <Dialog open={tradeModal.isOpen} onOpenChange={(open) => !open && closeTradeModal()}>
        <DialogContent className={`sm:max-w-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Trade {collectionData?.token_symbol || 'Tokens'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {tradeModal.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading token data...</span>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Amount ({getCurrencySymbol(collectionData?.chain_id)})
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={tradeModal.amount}
                    onChange={(e) => calculateTrade(e.target.value)}
                    className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
                  />
                </div>

                {tradeModal.amount && tradeModal.estimatedTokens > 0 && (
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        You will receive:
                      </span>
                      <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {tradeModal.estimatedTokens.toFixed(4)} {collectionData?.token_symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Price per token:
                      </span>
                      <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {tradeModal.estimatedTokens > 0 ? (tradeModal.estimatedCost / tradeModal.estimatedTokens).toFixed(6) : '0'} {getCurrencySymbol(collectionData?.chain_id)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={closeTradeModal}
                    className="flex-1"
                    disabled={tradeModal.isExecuting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={executeBuy}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                    disabled={!tradeModal.amount || !address || tradeModal.isExecuting || tradeModal.estimatedTokens <= 0}
                  >
                    {tradeModal.isExecuting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Buying...
                      </div>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {address ? 'Buy Tokens' : 'Connect Wallet'}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BidBopFooter />
      <Toaster position="top-right" richColors />
    </div>
  )
}
