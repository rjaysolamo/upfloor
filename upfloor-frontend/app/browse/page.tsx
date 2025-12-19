"use client"

import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, TrendingUp, TrendingDown, Eye, ShoppingCart, Filter, ExternalLink, X, ArrowUpDown } from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { usePublicClient, useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useWalletClient } from "wagmi"
import { createPublicClient, http } from "viem"
import { chainConfigs } from "@/lib/chainlist"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast, Toaster } from "sonner"
import { getTransactionErrorMessage, shouldLogError } from "@/lib/transaction-errors"

// Types for collection data
interface Collection {
  id: number
  collection_name: string
  token_symbol: string
  collection_image: string | null
  token_address: string
  router_address: string
  chain_id: number
  created_at: string
  description?: string
  total_supply?: number
  floor_price?: string
}

// Progress data type for auction progress tracking
type CollectionProgress = {
  tokenAddress: string
  poolBalance: number
  targetAmount: number
  progressPercentage: number
  isLoading: boolean
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
  },
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
    "name": "mintWithTaiko",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// TAIKO ERC-20 ABI (only used for Taiko chain)
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "redeem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "minOut", "type": "uint256" }],
    "name": "redeemWithTaiko",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "address", "name": "receiver", "type": "address" }],
    "name": "mintWithTaiko",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "previewRedeem",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Bonding curve price calculation functions (matching SwapWidget implementation)
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

// Trade modal state type
type TradeModalState = {
  isOpen: boolean
  collection: Collection | null
  tradeType: 'buy' | 'sell' | null
  amount: string
  estimatedTokens: number
  estimatedCost: number
  currentSupply: number
  K: number
  isLoading: boolean
  isExecuting: boolean
  txHash: string | null
}

// Chain explorer configurations
const CHAIN_EXPLORERS = {
  1: {
    name: "Ethereum",
    holderUrl: (address: string) => `https://etherscan.io/token/${address}#balances`
  },
  56: {
    name: "BSC",
    holderUrl: (address: string) => `https://bscscan.com/token/${address}#balances`
  },
  137: {
    name: "Polygon",
    holderUrl: (address: string) => `https://polygonscan.com/token/${address}#balances`
  },
  250: {
    name: "Fantom",
    holderUrl: (address: string) => `https://ftmscan.com/token/${address}#balances`
  },
  42161: {
    name: "Arbitrum",
    holderUrl: (address: string) => `https://arbiscan.io/token/${address}#balances`
  },
  10: {
    name: "Optimism",
    holderUrl: (address: string) => `https://optimistic.etherscan.io/token/${address}#balances`
  },
  43114: {
    name: "Avalanche",
    holderUrl: (address: string) => `https://snowtrace.io/token/${address}#balances`
  },
  8453: {
    name: "Base",
    holderUrl: (address: string) => `https://basescan.org/token/${address}#balances`
  },
  59144: {
    name: "Linea",
    holderUrl: (address: string) => `https://lineascan.build/token/${address}#balances`
  },
  534352: {
    name: "Scroll",
    holderUrl: (address: string) => `https://scrollscan.com/token/${address}#balances`
  },
  324: {
    name: "zkSync Era",
    holderUrl: (address: string) => `https://era.zksync.network/address/${address}#balances`
  },
  100: {
    name: "Gnosis",
    holderUrl: (address: string) => `https://gnosisscan.io/token/${address}#balances`
  },
  1284: {
    name: "Moonbeam",
    holderUrl: (address: string) => `https://moonscan.io/token/${address}#balances`
  },
  1285: {
    name: "Moonriver",
    holderUrl: (address: string) => `https://moonriver.moonscan.io/token/${address}#balances`
  },
  25: {
    name: "Cronos",
    holderUrl: (address: string) => `https://cronoscan.com/token/${address}#balances`
  },
  1666600000: {
    name: "Harmony",
    holderUrl: (address: string) => `https://explorer.harmony.one/address/${address}#balances`
  },
  128: {
    name: "Heco",
    holderUrl: (address: string) => `https://hecoinfo.com/token/${address}#balances`
  },
  66: {
    name: "OKC",
    holderUrl: (address: string) => `https://www.oklink.com/en/okc/token/${address}#balances`
  },
  1088: {
    name: "Metis",
    holderUrl: (address: string) => `https://andromeda-explorer.metis.io/token/${address}#balances`
  },
  288: {
    name: "Boba",
    holderUrl: (address: string) => `https://bobascan.com/token/${address}#balances`
  },
  106: {
    name: "Velas",
    holderUrl: (address: string) => `https://evmexplorer.velas.com/token/${address}#balances`
  },
  1313161554: {
    name: "Aurora",
    holderUrl: (address: string) => `https://aurorascan.dev/token/${address}#balances`
  },
  9001: {
    name: "Evmos",
    holderUrl: (address: string) => `https://evm.evmos.org/token/${address}#balances`
  },
  7700: {
    name: "Canto",
    holderUrl: (address: string) => `https://tuber.build/token/${address}#balances`
  },
  2222: {
    name: "Kava",
    holderUrl: (address: string) => `https://explorer.kava.io/token/${address}#balances`
  },
  5000: {
    name: "Mantle",
    holderUrl: (address: string) => `https://explorer.mantle.xyz/token/${address}#balances`
  },
  81457: {
    name: "Blast",
    holderUrl: (address: string) => `https://blastscan.io/token/${address}#balances`
  },
  7777777: {
    name: "Zora",
    holderUrl: (address: string) => `https://explorer.zora.energy/token/${address}#balances`
  },
  204: {
    name: "opBNB",
    holderUrl: (address: string) => `https://opbnbscan.com/token/${address}#balances`
  },
  169: {
    name: "Manta",
    holderUrl: (address: string) => `https://pacific-explorer.manta.network/token/${address}#balances`
  },
  34443: {
    name: "Mode",
    holderUrl: (address: string) => `https://explorer.mode.network/token/${address}#balances`
  },
  42766: {
    name: "ZKFair",
    holderUrl: (address: string) => `https://scan.zkfair.io/token/${address}#balances`
  },
  2525: {
    name: "Fraxtal",
    holderUrl: (address: string) => `https://fraxscan.com/token/${address}#balances`
  },
  3776: {
    name: "Astar zkEVM",
    holderUrl: (address: string) => `https://astar-zkevm.explorer.startale.com/token/${address}#balances`
  },
  690: {
    name: "Redstone",
    holderUrl: (address: string) => `https://redstone.blockscout.com/token/${address}#balances`
  },
  7001: {
    name: "ZetaChain",
    holderUrl: (address: string) => `https://explorer.zetachain.com/token/${address}#balances`
  },
  195: {
    name: "X1",
    holderUrl: (address: string) => `https://x1.blockscout.com/token/${address}#balances`
  },
  33139: {
    name: "ApeChain",
    holderUrl: (address: string) => `https://apescan.io/token/tokenholderchart/${address}`
  },
  167000: {
    name: "Taiko Alethia",
    holderUrl: (address: string) => `https://taikoscan.io/token/${address}#balances`
  },
  148: {
    name: "ShimmerEVM",
    holderUrl: (address: string) => `https://explorer.evm.shimmer.network/token/${address}#balances`
  },
  5003: {
    name: "Mantle Sepolia",
    holderUrl: (address: string) => `https://sepolia.mantlescan.xyz/token/${address}#balances`
  },
  11155111: {
    name: "Sepolia",
    holderUrl: (address: string) => `https://sepolia.etherscan.io/token/${address}#balances`
  },
  97: {
    name: "BSC Testnet",
    holderUrl: (address: string) => `https://testnet.bscscan.com/token/${address}#balances`
  },
  80001: {
    name: "Mumbai",
    holderUrl: (address: string) => `https://mumbai.polygonscan.com/token/${address}#balances`
  },
  4002: {
    name: "Fantom Testnet",
    holderUrl: (address: string) => `https://testnet.ftmscan.com/token/${address}#balances`
  },
  421614: {
    name: "Arbitrum Sepolia",
    holderUrl: (address: string) => `https://sepolia.arbiscan.io/token/${address}#balances`
  },
  11155420: {
    name: "Optimism Sepolia",
    holderUrl: (address: string) => `https://sepolia-optimism.etherscan.io/token/${address}#balances`
  },
  43113: {
    name: "Avalanche Fuji",
    holderUrl: (address: string) => `https://testnet.snowtrace.io/token/${address}#balances`
  },
  84532: {
    name: "Base Sepolia",
    holderUrl: (address: string) => `https://sepolia.basescan.org/token/${address}#balances`
  },
  59141: {
    name: "Linea Sepolia",
    holderUrl: (address: string) => `https://sepolia.lineascan.build/token/${address}#balances`
  },
  534351: {
    name: "Scroll Sepolia",
    holderUrl: (address: string) => `https://sepolia.scrollscan.com/token/${address}#balances`
  },
  280: {
    name: "zkSync Era Testnet",
    holderUrl: (address: string) => `https://goerli.explorer.zksync.io/address/${address}#balances`
  },
  10200: {
    name: "Gnosis Chiado",
    holderUrl: (address: string) => `https://gnosis-chiado.blockscout.com/token/${address}#balances`
  },
  1287: {
    name: "Moonbase Alpha",
    holderUrl: (address: string) => `https://moonbase.moonscan.io/token/${address}#balances`
  },
  338: {
    name: "Cronos Testnet",
    holderUrl: (address: string) => `https://testnet.cronoscan.com/token/${address}#balances`
  },
  1666700000: {
    name: "Harmony Testnet",
    holderUrl: (address: string) => `https://explorer.pops.one/address/${address}#balances`
  },
  256: {
    name: "Heco Testnet",
    holderUrl: (address: string) => `https://testnet.hecoinfo.com/token/${address}#balances`
  },
  65: {
    name: "OKC Testnet",
    holderUrl: (address: string) => `https://www.oklink.com/en/okc-test/token/${address}#balances`
  },
  599: {
    name: "Metis Goerli",
    holderUrl: (address: string) => `https://goerli.explorer.metisdev.xyz/token/${address}#balances`
  },
  28882: {
    name: "Boba Goerli",
    holderUrl: (address: string) => `https://testnet.bobascan.com/token/${address}#balances`
  },
  107: {
    name: "Velas Testnet",
    holderUrl: (address: string) => `https://evmexplorer.testnet.velas.com/token/${address}#balances`
  },
  1313161555: {
    name: "Aurora Testnet",
    holderUrl: (address: string) => `https://testnet.aurorascan.dev/token/${address}#balances`
  },
  9000: {
    name: "Evmos Testnet",
    holderUrl: (address: string) => `https://evm.evmos.dev/token/${address}#balances`
  },
  7701: {
    name: "Canto Testnet",
    holderUrl: (address: string) => `https://testnet.tuber.build/token/${address}#balances`
  },
  2221: {
    name: "Kava Testnet",
    holderUrl: (address: string) => `https://explorer.evm-alpha.kava.io/token/${address}#balances`
  },
  5001: {
    name: "Mantle Testnet",
    holderUrl: (address: string) => `https://explorer.testnet.mantle.xyz/token/${address}#balances`
  },
  168587773: {
    name: "Blast Sepolia",
    holderUrl: (address: string) => `https://sepolia.blastscan.io/token/${address}#balances`
  },
  999999999: {
    name: "Zora Sepolia",
    holderUrl: (address: string) => `https://sepolia.explorer.zora.energy/token/${address}#balances`
  },
  5611: {
    name: "opBNB Testnet",
    holderUrl: (address: string) => `https://testnet.opbnbscan.com/token/${address}#balances`
  },
  3441005: {
    name: "Manta Pacific Testnet",
    holderUrl: (address: string) => `https://pacific-explorer.testnet.manta.network/token/${address}#balances`
  },
  919: {
    name: "Mode Testnet",
    holderUrl: (address: string) => `https://sepolia.explorer.mode.network/token/${address}#balances`
  },
  43851: {
    name: "ZKFair Testnet",
    holderUrl: (address: string) => `https://testnet-scan.zkfair.io/token/${address}#balances`
  },
  2522: {
    name: "Fraxtal Testnet",
    holderUrl: (address: string) => `https://testnet.fraxscan.com/token/${address}#balances`
  },
  3777: {
    name: "Astar zkEVM Testnet",
    holderUrl: (address: string) => `https://astar-zkevm.explorer.testnet.startale.com/token/${address}#balances`
  },
  401: {
    name: "Redstone Holesky",
    holderUrl: (address: string) => `https://redstone-holesky.blockscout.com/token/${address}#balances`
  },
  7000: {
    name: "ZetaChain Athens",
    holderUrl: (address: string) => `https://athens.explorer.zetachain.com/token/${address}#balances`
  },
  1951: {
    name: "X1 Testnet",
    holderUrl: (address: string) => `https://x1-testnet.blockscout.com/token/${address}#balances`
  },
  1071: {
    name: "ShimmerEVM Testnet",
    holderUrl: (address: string) => `https://explorer.evm.testnet.shimmer.network/token/${address}#balances`
  }
}

export default function BrowsePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const { isDarkMode } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collectionProgress, setCollectionProgress] = useState<{ [key: string]: CollectionProgress }>({})
  const [tradeModal, setTradeModal] = useState<TradeModalState>({
    isOpen: false,
    collection: null,
    tradeType: null,
    amount: '',
    estimatedTokens: 0,
    estimatedCost: 0,
    currentSupply: 0,
    K: 0,
    isLoading: false,
    isExecuting: false,
    txHash: null
  })

  const publicClient = usePublicClient()
  const { address, isConnected, chain: connectedChain } = useAccount()
  const { writeContract, data: hash, isPending, error: contractError } = useWriteContract()
  const { switchChain } = useSwitchChain()
  const { data: walletClient } = useWalletClient()

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    setMounted(true)
    fetchCollections()
  }, [])

  // Auto-refresh progress data every 10 seconds
  useEffect(() => {
    if (collections.length > 0 && publicClient) {
      const interval = setInterval(() => {
        console.log('?? Auto-refreshing collection progress data...')
        fetchCollectionProgress()
      }, 10000) // Refresh every 10 seconds

      return () => clearInterval(interval)
    }
  }, [collections, publicClient])

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

      // Refresh progress bars after successful transaction
      if (publicClient) {
        fetchCollectionProgress()
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

      // Only log errors that aren't user cancellations
      if (shouldLogError(contractError)) {
        console.error('Contract error:', contractError)
      }

      // Get user-friendly error message
      const errorInfo = getTransactionErrorMessage(contractError)

      if (errorInfo.variant === 'destructive') {
        toast.error(`${errorInfo.title}: ${errorInfo.description}`)
      } else {
        toast.info(`${errorInfo.title}: ${errorInfo.description}`)
      }
    }
  }, [contractError])

  // Fetch progress data when collections are loaded or publicClient changes
  useEffect(() => {
    console.log('Browse page useEffect triggered:', {
      collectionsLength: collections.length,
      hasPublicClient: !!publicClient,
      publicClientChain: publicClient?.chain?.id
    })
    if (collections.length > 0) {
      if (publicClient) {
        console.log('?? Fetching collection progress data on mount/change...')
        fetchCollectionProgress()
      } else {
        // Set a state indicating no wallet connection
        console.log('No publicClient available, setting no-wallet state')
        setCollectionProgress({})
      }
    }
  }, [collections, publicClient])

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collections')
      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }
      const data = await response.json()
      console.log('Fetched collections:', data.collections)

      // Debug: Check what data each collection has
      if (data.collections && data.collections.length > 0) {
        console.log('Collection data analysis:', data.collections.map((c: Collection) => ({
          symbol: c.token_symbol,
          hasFloorPrice: !!c.floor_price,
          hasTotalSupply: !!c.total_supply,
          floorPrice: c.floor_price,
          totalSupply: c.total_supply,
          tokenAddress: c.token_address
        })))
      }

      setCollections(data.collections || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Fetch collection progress data (pool balance and target amount)
  const fetchCollectionProgress = async () => {
    if (!publicClient || !collections.length) return

    console.log('Fetching collection progress data for browse page...', { collectionsCount: collections.length })

    for (const collection of collections) {
      const tokenAddress = collection.token_address.toLowerCase()

      console.log(`Processing collection: ${collection.token_symbol}`, {
        tokenAddress,
        floorPrice: collection.floor_price,
        totalSupply: collection.total_supply,
        chainId: collection.chain_id
      })

      // Set loading state
      setCollectionProgress(prev => ({
        ...prev,
        [tokenAddress]: {
          tokenAddress,
          poolBalance: 0,
          targetAmount: 0,
          progressPercentage: 0,
          isLoading: true
        }
      }))

      try {
        let contractBalance: bigint
        let contractBalanceInNative: number

        // Special handling for Taiko chain (167000) - use TAIKO token balance
        if (collection.chain_id === 167000) {
          // Taiko chain - get TAIKO token balance of the contract
          // Create a dedicated Taiko client to read from Taiko network
          const taikoClient = createPublicClient({
            transport: http('https://rpc.taiko.xyz')
          })

          const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"

          // Check balance of TAIKO token held by the token contract
          contractBalance = await taikoClient.readContract({
            address: TAIKO_TOKEN_ADDRESS,
            abi: TAIKO_TOKEN_ABI,
            functionName: 'balanceOf',
            args: [collection.token_address as `0x${string}`]
          })

          contractBalanceInNative = Number(contractBalance) / 1e18
          console.log(`Contract TAIKO balance for ${collection.token_symbol}: ${contractBalanceInNative} TAIKO`)
        } else {
          // All other chains - get native currency balance of the token contract
          console.log(`Fetching contract balance for ${collection.token_address}`)
          contractBalance = await publicClient.getBalance({
            address: collection.token_address as `0x${string}`
          })

          contractBalanceInNative = Number(contractBalance) / 1e18
          console.log(`Contract balance for ${collection.token_symbol}: ${contractBalanceInNative} ${getChainCurrency(collection.chain_id)}`)
        }

        // Calculate target amount based on floor price
        // Target = floor_price (this is the total amount needed to buy the collection)
        let targetAmount = 0
        if (collection.floor_price) {
          targetAmount = parseFloat(collection.floor_price)
          console.log(`Target amount for ${collection.token_symbol}: ${targetAmount} ${getChainCurrency(collection.chain_id)} (floor price is total collection cost)`)
        } else {
          console.log(`Missing data for ${collection.token_symbol}: floor_price=${collection.floor_price}`)
        }

        // Calculate progress percentage
        let progressPercentage = 0
        if (targetAmount > 0) {
          progressPercentage = Math.min((contractBalanceInNative / targetAmount) * 100, 100)
        }

        // Update progress data
        setCollectionProgress(prev => ({
          ...prev,
          [tokenAddress]: {
            tokenAddress,
            poolBalance: contractBalanceInNative, // Using contract balance as pool balance
            targetAmount,
            progressPercentage,
            isLoading: false
          }
        }))


        console.log(`? Progress for ${collection.token_symbol}: ${progressPercentage.toFixed(2)}% (${contractBalanceInNative.toFixed(4)} / ${targetAmount.toFixed(4)} ${getChainCurrency(collection.chain_id)})`)

      } catch (error) {
        console.error(`? Error fetching progress for ${collection.token_symbol}:`, error)

        // Set error state
        setCollectionProgress(prev => ({
          ...prev,
          [tokenAddress]: {
            tokenAddress,
            poolBalance: 0,
            targetAmount: 0,
            progressPercentage: 0,
            isLoading: false
          }
        }))
      }
    }
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  const filteredCollections = collections.filter(collection =>
    collection.collection_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collection.token_symbol.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedCollections = [...filteredCollections].sort((a, b) => {
    switch (sortBy) {
      case "created_at":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case "collection_name":
        return a.collection_name.localeCompare(b.collection_name)
      case "token_symbol":
        return a.token_symbol.localeCompare(b.token_symbol)
      default:
        return 0
    }
  })

  const getChainName = (chainId: number) => {
    return CHAIN_EXPLORERS[chainId as keyof typeof CHAIN_EXPLORERS]?.name || `Chain ${chainId}`
  }

  const getChainCurrency = (chainId: number) => {
    // Special case for Taiko chain - use TAIKO token
    if (chainId === 167000) {
      return 'TAIKO'
    }
    const chain = chainConfigs[chainId as keyof typeof chainConfigs]
    return chain ? chain.currency : 'ETH'
  }

  const getHolderUrl = (chainId: number, tokenAddress: string) => {
    const explorer = CHAIN_EXPLORERS[chainId as keyof typeof CHAIN_EXPLORERS]
    if (explorer) {
      const url = explorer.holderUrl(tokenAddress)
      console.log(`Generated holder URL for chain ${chainId}:`, url)
      return url
    }

    // Fallback for unsupported chains - use Etherscan as default
    console.warn(`Chain ID ${chainId} not found in CHAIN_EXPLORERS, using Etherscan fallback`)
    return `https://etherscan.io/token/${tokenAddress}#balances`
  }

  const getCollectionAvatar = (collection: Collection) => {
    if (collection.collection_image) {
      return (
        <img
          src={collection.collection_image}
          alt={collection.collection_name}
          className="w-8 h-8 rounded-lg object-cover"
        />
      )
    }
    // Fallback to emoji based on symbol
    const emojiMap: { [key: string]: string } = {
      'XYZ': '??',
      'RNZO': '??',
      'JRKY': '??',
      'PNKSTR': '??',
      'BORED': '??',
      'ART': '??',
      'DEFI': '?',
      'GAME': '??',
      'META': '??'
    }
    return emojiMap[collection.token_symbol] || '??'
  }

  // Trade modal functions
  const openTradeModal = async (collection: Collection) => {
    if (!isConnected) {
      toast.error('Wallet Connection Required', {
        description: 'Please connect your wallet to start trading',
        action: {
          label: 'Dismiss',
          onClick: () => { }
        }
      })
      return
    }

    // Check if user is on the correct network
    if (connectedChain && connectedChain.id !== collection.chain_id) {
      const chainName = getChainName(collection.chain_id)
      toast.error('Wrong Network', {
        description: `Please switch to ${chainName} to trade this token`,
        action: {
          label: 'Switch Network',
          onClick: async () => {
            try {
              await switchChain?.({ chainId: collection.chain_id })
              toast.success('Network switched successfully')
              // Retry opening the modal after successful switch
              setTimeout(() => openTradeModal(collection), 500)
            } catch (error) {
              console.error('Error switching network:', error)
              toast.error('Failed to switch network. Please switch manually in your wallet.')
            }
          }
        }
      })
      return
    }

    setTradeModal(prev => ({
      ...prev,
      isOpen: true,
      collection,
      tradeType: null,
      amount: '',
      estimatedTokens: 0,
      estimatedCost: 0,
      currentSupply: 0,
      K: 0,
      isLoading: true
    }))

    try {
      // Fetch token contract data
      const [totalSupply, curve] = await Promise.all([
        publicClient?.readContract({
          address: collection.token_address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'totalSupply'
        }).catch(() => BigInt(0)),
        publicClient?.readContract({
          address: collection.token_address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'curve'
        }).catch(() => null)
      ])

      const currentSupply = Number(totalSupply || BigInt(0)) / 1e18
      let K = 0.0001 // Default fallback

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
      collection: null,
      tradeType: null,
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

  const calculateTrade = (amount: string, tradeType: 'buy' | 'sell') => {
    if (!amount || !tradeModal.collection || !tradeModal.K) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return

    const FEE_RATE = 0.1 // 10% fee

    if (tradeType === 'buy') {
      // Calculate how many tokens we can buy with this amount of native currency
      const tokensForETH = getTokensForETH(amountNum, tradeModal.currentSupply, tradeModal.K, FEE_RATE)
      setTradeModal(prev => ({
        ...prev,
        amount,
        tradeType,
        estimatedTokens: tokensForETH,
        estimatedCost: amountNum
      }))
    } else {
      // Calculate how much native currency we get for selling this amount of tokens
      const costForTokens = getPriceForTokens(amountNum, tradeModal.currentSupply, tradeModal.K, FEE_RATE)
      setTradeModal(prev => ({
        ...prev,
        amount,
        tradeType,
        estimatedTokens: amountNum,
        estimatedCost: costForTokens
      }))
    }
  }

  // Execute buy transaction
  const executeBuy = async () => {
    if (!tradeModal.collection || !address) return

    try {
      const tokenAmountWei = BigInt(Math.floor(tradeModal.estimatedTokens * 1e18))
      const amountWei = BigInt(Math.floor(parseFloat(tradeModal.amount) * 1e18))

      // Special handling for Taiko chain (167000) - use TAIKO tokens
      if (tradeModal.collection.chain_id === 167000 && publicClient) {
        const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"

        // First, get the exact cost using previewMint (if available) or use provided amount
        let bestCost = amountWei
        try {
          // Try to get previewMint to get exact cost
          const previewCost = await publicClient.readContract({
            address: tradeModal.collection.token_address as `0x${string}`,
            abi: [
              {
                "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
                "name": "previewMint",
                "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: 'previewMint',
            args: [tokenAmountWei]
          })
          bestCost = previewCost as bigint
        } catch (e) {
          // Fallback to using amountWei if previewMint fails
          console.log('previewMint not available, using provided amount')
        }

        // Check TAIKO token balance
        const taikoBalance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: TAIKO_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        })

        if (taikoBalance < bestCost) {
          toast.error('Insufficient TAIKO', {
            description: `Need ${(Number(bestCost) / 1e18).toFixed(6)} TAIKO but you have ${(Number(taikoBalance) / 1e18).toFixed(6)} TAIKO`
          })
          return
        }

        // Check allowance - approve to TOKEN contract (not router), matching SwapWidget pattern
        const currentAllowance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: TAIKO_TOKEN_ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, tradeModal.collection.token_address as `0x${string}`]
        })

        console.log('TAIKO Allowance Check:', {
          currentAllowance: (Number(currentAllowance) / 1e18).toFixed(6),
          neededAmount: (Number(bestCost) / 1e18).toFixed(6),
          needsApproval: currentAllowance < bestCost
        })

        // Only approve if current allowance is insufficient
        if (currentAllowance < bestCost) {
          if (!walletClient) {
            toast.error('Wallet not connected', {
              description: 'Please connect your wallet to continue'
            })
            return
          }

          toast.info('Approving TAIKO', {
            description: 'Approving TAIKO token spending...'
          })

          try {
            // Approve a larger amount to avoid frequent approvals (approve 10x the needed amount)
            const approvalAmount = bestCost * BigInt(10) // Approve 10x the needed amount for future transactions

            const approveHash = await walletClient.writeContract({
              address: TAIKO_TOKEN_ADDRESS,
              abi: TAIKO_TOKEN_ABI,
              functionName: 'approve',
              args: [tradeModal.collection.token_address as `0x${string}`, approvalAmount]
            })

            // Wait for approval to complete
            await publicClient?.waitForTransactionReceipt({ hash: approveHash })

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

        // Execute mintWithTaiko transaction directly on TOKEN contract (matching SwapWidget pattern)
        writeContract({
          address: tradeModal.collection.token_address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'mintWithTaiko',
          args: [tokenAmountWei, address as `0x${string}`]
        })

      } else {
        // All other chains - use native currency (ETH, MATIC, etc.)
        writeContract({
          address: tradeModal.collection.router_address as `0x${string}`,
          abi: ROUTER_ABI,
          functionName: 'mint',
          args: [tokenAmountWei, address as `0x${string}`],
          value: amountWei
        })
      }
    } catch (err) {
      console.error('Error executing buy:', err)
      toast.error('Failed to execute buy transaction')
    }
  }

  // Execute sell transaction
  const executeSell = async () => {
    if (!tradeModal.collection || !address || !publicClient) return

    try {
      const tokenAmountWei = BigInt(Math.floor(tradeModal.estimatedTokens * 1e18))

      // Special handling for Taiko chain (167000) - use redeemWithTaiko
      if (tradeModal.collection.chain_id === 167000) {
        // Get preview to calculate expected output with slippage
        let minOut = BigInt(0)
        try {
          const previewOut = await publicClient.readContract({
            address: tradeModal.collection.token_address as `0x${string}`,
            abi: TOKEN_ABI,
            functionName: 'previewRedeem',
            args: [tokenAmountWei]
          })
          // Apply 1% slippage tolerance
          minOut = (previewOut as bigint) * BigInt(99) / BigInt(100)
        } catch (e) {
          console.log('previewRedeem not available, using estimated cost')
          // Fallback to estimated cost with slippage
          const estimatedCost = BigInt(Math.floor(tradeModal.estimatedCost * 1e18))
          minOut = estimatedCost * BigInt(99) / BigInt(100)
        }

        writeContract({
          address: tradeModal.collection.token_address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'redeemWithTaiko',
          args: [tokenAmountWei, address as `0x${string}`, address as `0x${string}`, minOut]
        })
      } else {
        // All other chains - use standard redeem
        writeContract({
          address: tradeModal.collection.token_address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'redeem',
          args: [tokenAmountWei]
        })
      }
    } catch (err) {
      console.error('Error executing sell:', err)
      toast.error('Failed to execute sell transaction')
    }
  }

  // Handle trade execution
  const handleTrade = () => {
    if (tradeModal.tradeType === 'buy') {
      executeBuy()
    } else if (tradeModal.tradeType === 'sell') {
      executeSell()
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
      }`}>
      <BidBopHeader />

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Header Section */}
        <div className="mb-6 text-center">
          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
            Browse Collections
          </h1>
          <p className={`text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
            Discover and explore DeFi strategy tokens. Find the perfect strategy for your portfolio! ?
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-4xl mx-auto">
            <div className="relative flex-1 max-w-lg">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              <Input
                placeholder="Search Collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 h-9 rounded-lg text-sm transition-colors duration-300 ${isDarkMode
                  ? 'bg-gray-800/80 border-gray-600 focus:border-purple-400 focus:ring-purple-300 text-white placeholder-gray-400'
                  : 'bg-white/80 border-gray-200 focus:border-purple-300 focus:ring-purple-200 text-gray-800 placeholder-gray-500'
                  }`}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className={`h-4 w-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-3 py-2 rounded-lg border h-9 text-sm transition-colors duration-300 ${isDarkMode
                  ? 'border-gray-600 bg-gray-800/80 text-white focus:border-purple-400 focus:ring-purple-300'
                  : 'border-gray-200 bg-white/80 text-gray-800 focus:border-purple-300 focus:ring-purple-200'
                  }`}
              >
                <option value="created_at">Newest First</option>
                <option value="collection_name">Name A-Z</option>
                <option value="token_symbol">Symbol A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className={`backdrop-blur-sm shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${isDarkMode
            ? 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800/80'
            : 'bg-white/70 border-gray-200/60 hover:bg-white/80'
            }`}>
            <CardContent className="p-3 text-center">
              <div className={`text-lg font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                {loading ? '...' : collections.length}
              </div>
              <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Active Collections</div>
            </CardContent>
          </Card>
          <Card className={`backdrop-blur-sm shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${isDarkMode
            ? 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800/80'
            : 'bg-white/70 border-gray-200/60 hover:bg-white/80'
            }`}>
            <CardContent className="p-3 text-center">
              <div className={`text-lg font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                {loading ? '...' : new Set(collections.map(c => c.chain_id)).size}
              </div>
              <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Supported Chains</div>
            </CardContent>
          </Card>
          <Card className={`backdrop-blur-sm shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${isDarkMode
            ? 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800/80'
            : 'bg-white/70 border-gray-200/60 hover:bg-white/80'
            }`}>
            <CardContent className="p-3 text-center">
              <div className={`text-lg font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                {loading ? '...' : collections.filter(c => c.collection_image).length}
              </div>
              <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>With Strategy</div>
            </CardContent>
          </Card>
          <Card className={`backdrop-blur-sm shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${isDarkMode
            ? 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800/80'
            : 'bg-white/70 border-gray-200/60 hover:bg-white/80'
            }`}>
            <CardContent className="p-3 text-center">
              <div className={`text-lg font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                {loading ? '...' : new Date().toLocaleDateString()}
              </div>
              <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Last Updated</div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            {/* Animated Logo/Icon */}
            <div className="relative mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 animate-pulse shadow-lg"></div>
              <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 animate-spin opacity-20" style={{ animationDuration: '3s' }}></div>
              <div className="absolute inset-2 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm animate-pulse"></div>
            </div>

            {/* Cool Loading Dots */}
            <div className="flex justify-center space-x-2 mb-6">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>

            {/* Progress Bar */}
            <div className="w-64 mx-auto mb-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full animate-pulse" style={{
                  width: '100%',
                  animation: 'progress 2s ease-in-out infinite'
                }}></div>
              </div>
            </div>

            {/* Loading Text */}
            <p className="text-gray-500 text-sm animate-pulse">
              Discovering amazing collections...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className={`text-lg transition-colors duration-300 ${isDarkMode ? 'text-red-300' : 'text-red-600'
              }`}>
              Error: {error}
            </div>
            <Button
              onClick={fetchCollections}
              className="mt-2"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Collections Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {sortedCollections.map((collection) => (
              <Card key={collection.id} className={`backdrop-blur-sm shadow-sm rounded-2xl hover:shadow-md transition-all duration-200 group overflow-hidden ${isDarkMode
                ? 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800/80'
                : 'bg-white/70 border-gray-200/60 hover:bg-white/80'
                }`}>
                <CardHeader className={`pb-2 pt-3 transition-all duration-300 ${isDarkMode
                  ? 'bg-gray-800/70'
                  : 'bg-gradient-to-r from-gray-50/50 to-purple-50/30'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm group-hover:scale-105 transition-transform duration-200 ${isDarkMode
                        ? 'bg-gradient-to-br from-purple-600 to-pink-600 border border-purple-500'
                        : 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200'
                        }`}>
                        {getCollectionAvatar(collection)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className={`text-xs font-semibold truncate transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>{collection.collection_name}</CardTitle>
                        <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>${collection.token_symbol}</p>
                      </div>
                    </div>
                    <Badge
                      className={`text-xs px-2 py-1 rounded-full ${isDarkMode
                        ? "bg-blue-900/50 text-blue-300 border border-blue-700"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                    >
                      {getChainName(collection.chain_id)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-3">
                    <p className={`text-xs line-clamp-2 leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                      {collection.description || `Token collection on ${getChainName(collection.chain_id)}`}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`rounded-lg p-2 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'
                        }`}>
                        <div className={`text-xs mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>Token Address</div>
                        <div className={`font-mono text-xs transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                          {collection.token_address.slice(0, 6)}...{collection.token_address.slice(-4)}
                        </div>
                      </div>
                      <div className={`rounded-lg p-2 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'
                        }`}>
                        <div className={`text-xs mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>Chain ID</div>
                        <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>{collection.chain_id}</div>
                      </div>
                      <div className={`rounded-lg p-2 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'
                        }`}>
                        <div className={`text-xs mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>Created</div>
                        <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                          {new Date(collection.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`rounded-lg p-2 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'
                        }`}>
                        <div className={`text-xs mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>Holders</div>
                        <a
                          href={getHolderUrl(collection.chain_id, collection.token_address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`font-semibold transition-colors duration-300 hover:underline flex items-center gap-1 ${isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-500'
                            }`}
                          onClick={() => {
                            console.log('Holder link clicked:', {
                              chainId: collection.chain_id,
                              tokenAddress: collection.token_address,
                              url: getHolderUrl(collection.chain_id, collection.token_address)
                            })
                          }}
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>


                    {/* Progress Bar */}
                    {(() => {
                      const progress = collectionProgress[collection.token_address.toLowerCase()]
                      console.log(`Progress data for ${collection.token_symbol}:`, progress)
                      console.log(`Collection data:`, {
                        token_address: collection.token_address,
                        floor_price: collection.floor_price,
                        total_supply: collection.total_supply,
                        chain_id: collection.chain_id
                      })

                      if (!progress || progress.isLoading) {
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>Progress</span>
                              <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                {!publicClient ? 'Connect wallet' : 'Loading...'}
                              </span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                              }`}>
                              <div className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse`} style={{ width: '30%' }}></div>
                            </div>
                            {!publicClient && (
                              <div className={`text-xs text-center transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                Connect wallet to view progress
                              </div>
                            )}
                          </div>
                        )
                      }

                      // Show progress even if target amount is 0 (no floor price or supply data)
                      const hasValidTarget = progress.targetAmount > 0
                      const displayPercentage = hasValidTarget ? progress.progressPercentage : 0

                      console.log(`Rendering progress for ${collection.token_symbol}:`, {
                        hasValidTarget,
                        displayPercentage,
                        poolBalance: progress.poolBalance,
                        targetAmount: progress.targetAmount
                      })

                      return (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>Progress</span>
                            <span className={`text-xs font-medium transition-colors duration-300 ${!hasValidTarget
                              ? 'text-gray-500'
                              : displayPercentage >= 100
                                ? 'text-emerald-500'
                                : displayPercentage >= 50
                                  ? 'text-yellow-500'
                                  : 'text-orange-500'
                              }`}>
                              {!hasValidTarget ? 'N/A' : `${displayPercentage.toFixed(1)}%`}
                            </span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                            }`}>
                            <div
                              className={`h-full transition-all duration-500 ease-out ${!hasValidTarget
                                ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                                : displayPercentage >= 100
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                  : displayPercentage >= 50
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                }`}
                              style={{ width: `${Math.min(displayPercentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                              {progress.poolBalance.toFixed(4)} {getChainCurrency(collection.chain_id)}
                            </span>
                            <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                              {hasValidTarget ? `/ ${progress.targetAmount.toFixed(4)} ${getChainCurrency(collection.chain_id)}` : 'No target set'}
                            </span>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="flex space-x-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => openTradeModal(collection)}
                        className={`flex-1 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] text-xs h-7 ${isDarkMode
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border border-purple-500 hover:border-purple-400'
                          : 'bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 border border-purple-200 hover:border-purple-300'
                          }`}
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Trade
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`flex-1 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] text-xs h-7 ${isDarkMode
                          ? 'bg-gray-700/80 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-600 hover:border-gray-500'
                          : 'bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300'
                          }`}
                        asChild
                      >
                        <a href={`/listing/${collection.token_symbol.toLowerCase()}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedCollections.length === 0 && (
          <div className="text-center py-8">
            <div className={`text-lg transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
              No collections found
            </div>
            <div className={`text-sm mt-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
              {searchTerm ? 'Try adjusting your search terms' : 'Be the first to deploy a collection!'}
            </div>
          </div>
        )}
      </main>

      {/* Trade Modal */}
      <Dialog open={tradeModal.isOpen} onOpenChange={closeTradeModal}>
        <DialogContent className={`max-w-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              <ShoppingCart className="h-5 w-5" />
              Trade {tradeModal.collection?.token_symbol}
            </DialogTitle>
          </DialogHeader>

          {tradeModal.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-purple-500/30 rounded-full animate-spin"></div>
                <span className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading token data...
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Collection Info */}
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-lg">
                    {tradeModal.collection && getCollectionAvatar(tradeModal.collection)}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {tradeModal.collection?.collection_name}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ${tradeModal.collection?.token_symbol} ? {getChainName(tradeModal.collection?.chain_id || 1)}
                    </p>
                  </div>
                </div>

              </div>

              {/* Trade Type Selection */}
              {!tradeModal.tradeType && (
                <div className="space-y-3">
                  <Label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    Choose Trade Type
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setTradeModal(prev => ({ ...prev, tradeType: 'buy' }))}
                      className={`h-12 font-medium ${isDarkMode
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Buy Tokens
                    </Button>
                    <Button
                      onClick={() => setTradeModal(prev => ({ ...prev, tradeType: 'sell' }))}
                      className={`h-12 font-medium ${isDarkMode
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                        }`}
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Sell Tokens
                    </Button>
                  </div>
                </div>
              )}

              {/* Trade Form */}
              {tradeModal.tradeType && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {tradeModal.tradeType === 'buy' ? 'Buy' : 'Sell'} {tradeModal.collection?.token_symbol}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTradeModal(prev => ({ ...prev, tradeType: null, amount: '', estimatedTokens: 0, estimatedCost: 0 }))}
                      className="text-xs"
                    >
                      <ArrowUpDown className="h-3 w-3 mr-1" />
                      Switch
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {tradeModal.tradeType === 'buy'
                          ? `Amount (${getChainCurrency(tradeModal.collection?.chain_id || 1)})`
                          : `Amount (${tradeModal.collection?.token_symbol})`
                        }
                      </Label>
                      <Input
                        type="number"
                        placeholder={tradeModal.tradeType === 'buy' ? '0.0' : '0'}
                        value={tradeModal.amount}
                        onChange={(e) => {
                          const value = e.target.value
                          setTradeModal(prev => ({ ...prev, amount: value }))
                          if (value) {
                            calculateTrade(value, tradeModal.tradeType!)
                          }
                        }}
                        className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                      />
                    </div>

                    {tradeModal.amount && tradeModal.estimatedTokens > 0 && (
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                              {tradeModal.tradeType === 'buy' ? 'You will receive:' : 'You will get:'}
                            </span>
                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {tradeModal.tradeType === 'buy'
                                ? `${tradeModal.estimatedTokens.toFixed(4)} ${tradeModal.collection?.token_symbol}`
                                : `${tradeModal.estimatedCost.toFixed(6)} ${getChainCurrency(tradeModal.collection?.chain_id || 1)}`
                              }
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                              {tradeModal.tradeType === 'buy' ? 'Cost:' : 'Selling:'}
                            </span>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                              {tradeModal.tradeType === 'buy'
                                ? `${tradeModal.estimatedCost} ${getChainCurrency(tradeModal.collection?.chain_id || 1)}`
                                : `${tradeModal.estimatedTokens} ${tradeModal.collection?.token_symbol}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transaction Status */}
                    {tradeModal.isExecuting && tradeModal.txHash && (
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-700/50' : 'bg-blue-50 border border-blue-200'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                              {isConfirming ? 'Confirming Transaction...' : 'Transaction Submitted'}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {tradeModal.txHash.slice(0, 10)}...{tradeModal.txHash.slice(-8)}
                            </div>
                          </div>
                          {tradeModal.txHash && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const explorer = CHAIN_EXPLORERS[tradeModal.collection?.chain_id as keyof typeof CHAIN_EXPLORERS]
                                if (explorer) {
                                  const baseUrl = explorer.holderUrl('').replace('/token/#balances', '')
                                  window.open(`${baseUrl}/tx/${tradeModal.txHash}`, '_blank')
                                }
                              }}
                              className="text-xs"
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={closeTradeModal}
                        variant="outline"
                        className="flex-1"
                        disabled={tradeModal.isExecuting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleTrade}
                        disabled={!tradeModal.amount || tradeModal.estimatedTokens <= 0 || tradeModal.isExecuting || isPending}
                        className={`flex-1 ${tradeModal.tradeType === 'buy'
                          ? 'bg-green-600 hover:bg-green-500 text-white'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                          }`}
                      >
                        {tradeModal.isExecuting || isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {isConfirming ? 'Confirming...' : 'Executing...'}
                          </div>
                        ) : (
                          `${tradeModal.tradeType === 'buy' ? 'Buy' : 'Sell'} ${tradeModal.collection?.token_symbol}`
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BidBopFooter />
      <Toaster position="top-right" richColors />
    </div>
  )
}
