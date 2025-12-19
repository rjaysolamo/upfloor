"use client"

// Force dynamic rendering to avoid SSR issues with wagmi
export const dynamic = 'force-dynamic'

import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import { useSafeAccount } from "@/hooks/use-safe-wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, ExternalLink, TrendingUp, TrendingDown, Eye, ShoppingCart, BarChart3, Activity, ArrowUpRight, ArrowDownRight, RefreshCw, Zap, Search } from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { createPublicClient, http } from "viem"
import { getChainConfig } from "@/lib/chainlist"
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from "wagmi"
import { parseEther } from "viem"
import { useToast } from "@/hooks/use-toast"
import { getTransactionErrorMessage, shouldLogError } from "@/lib/transaction-errors"

// Token interface
interface Token {
  address: string
  symbol: string
  name: string
  routerAddress: string
  chainId: number
  networkName: string
  currency: string
  imageUrl?: string
  totalSupply: number
  listedCount: number
  floorPrice: number
  marketCap: number
  lastUpdated: string
}

// Price data interface
interface TokenPrice {
  tokenAddress: string
  tokenSymbol: string
  chainId: number
  currency: string
  currentSupply: string
  curveK: number
  feeRate: number
  priceForTokens: string
  pricePerToken: string
  tokensForOne: string
  networkName: string
}

// Chart data interface
interface ChartData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
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
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
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
    "name": "previewMint",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "previewRedeem",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minOut",
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
  }
] as const;

// TAIKO token address (used for Taiko chain transactions)
const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"

// Utility function to validate redemption amounts
function validateRedemptionAmount(amount: number, contractBalance: bigint, totalSupply: bigint, currentSupply?: number, curveK?: number, userBalance?: number): { isValid: boolean; reason?: string } {
  const amountWei = BigInt(Math.floor(amount * 1e18))
  const contractBalanceNum = Number(contractBalance) / 1e18
  const totalSupplyNum = Number(totalSupply) / 1e18

  // Check if user has enough tokens
  if (amount <= 0) {
    return { isValid: false, reason: "Amount must be greater than 0" }
  }

  // Check if user has sufficient balance
  if (userBalance !== undefined && amount > userBalance) {
    return { isValid: false, reason: `Insufficient token balance. You have ${userBalance.toFixed(6)} tokens` }
  }

  // Check if amount is reasonable - allow up to 90% of total supply if user owns most tokens
  // This prevents someone from redeeming all tokens and breaking the bonding curve
  const maxRedemptionPercent = userBalance && userBalance > totalSupplyNum * 0.8 ? 0.9 : 0.5
  if (amount > totalSupplyNum * maxRedemptionPercent) {
    return { isValid: false, reason: `Amount too large (max ${(maxRedemptionPercent * 100).toFixed(0)}% of total supply)` }
  }

  // If we have bonding curve parameters, use proper math
  if (currentSupply !== undefined && curveK !== undefined && curveK > 0) {
    // Calculate redemption value using bonding curve math
    // For redemption: value = K * (s^2 * tokens - s * tokens^2 + tokens^3 / 3) * (1 - feeRate)
    const s = currentSupply
    const tokens = amount
    const FEE_RATE = 0.1 // 10% fee
    const redemptionValue = curveK * (s * s * tokens - s * tokens * tokens + tokens * tokens * tokens / 3) * (1 - FEE_RATE)

    if (redemptionValue > contractBalanceNum) {
      return { isValid: false, reason: `Insufficient contract liquidity. Need ${redemptionValue.toFixed(6)} but contract has ${contractBalanceNum.toFixed(6)}` }
    }
  } else {
    // Fallback: just check if contract has some balance
    if (contractBalanceNum <= 0) {
      return { isValid: false, reason: "Contract has no liquidity available" }
    }
  }

  return { isValid: true }
}

// Bonding curve price calculation functions
function getPriceForTokens(tokens: number, currentSupply: number, K: number, feeRate: number): number {
  const s = currentSupply
  return K * (s * s * tokens + s * tokens * tokens + tokens * tokens * tokens / 3) * (1 + feeRate)
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

export default function TradingHubPage() {
  const { address, mounted: walletMounted } = useSafeAccount()
  const { isDarkMode } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { chain: connectedChain } = useAccount()
  const { switchChain } = useSwitchChain()

  // Trading state
  const [tokens, setTokens] = useState<Token[]>([])
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [tokenPrice, setTokenPrice] = useState<TokenPrice | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedChain, setSelectedChain] = useState<number>(1)
  const [timeframe, setTimeframe] = useState<string>("1h")
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy")
  const [tradeAmount, setTradeAmount] = useState<string>("")
  const [nativeCurrencyPrice, setNativeCurrencyPrice] = useState<number>(0)
  const [taikoTokenPrice, setTaikoTokenPrice] = useState<number>(0)
  const [contractBalance, setContractBalance] = useState<number>(0)
  const [userBalance, setUserBalance] = useState<number>(0)
  const [copied, setCopied] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [transactionHistory, setTransactionHistory] = useState<ChartData[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showNetworkMismatch, setShowNetworkMismatch] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchTokens()
    fetchNativeCurrencyPrice()
    if (selectedChain === 167000) {
      fetchTaikoTokenPrice()
    }

    // Check if wallet network matches selected network
    if (address && connectedChain && connectedChain.id !== selectedChain) {
      setShowNetworkMismatch(true)
      toast({
        title: "Network Mismatch",
        description: "Please switch your wallet to the selected network",
        variant: "destructive",
        duration: 5000
      })
    } else {
      setShowNetworkMismatch(false)
    }
  }, [selectedChain, connectedChain, address])

  useEffect(() => {
    if (selectedToken && publicClient) {
      fetchTokenPrice()
      fetchContractBalance()
      fetchUserBalance()
      generateChartData()
    }
  }, [selectedToken, timeframe, publicClient, address])

  useEffect(() => {
    generateChartData()
  }, [transactionHistory, tokenPrice])

  const fetchTokens = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tokens?chainId=${selectedChain}`)
      const data = await response.json()
      if (data.success) {
        setTokens(data.data)
        if (data.data.length > 0 && !selectedToken) {
          setSelectedToken(data.data[0])
        }
      }
    } catch (error) {
      console.error("Error fetching tokens:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTokenPrice = async () => {
    if (!selectedToken || !publicClient) return

    try {
      setLoadingPrice(true)

      // Get token contract data using client RPC
      const [totalSupply, symbol, curve] = await Promise.all([
        publicClient.readContract({
          address: selectedToken.address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'totalSupply'
        }).catch(() => BigInt(0)),
        publicClient.readContract({
          address: selectedToken.address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'symbol'
        }).catch(() => 'UNKNOWN'),
        publicClient.readContract({
          address: selectedToken.address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'curve'
        }).catch(() => null) // Fallback if curve doesn't exist
      ])

      console.log('Token data from client RPC:', { totalSupply, symbol, curve })

      // Get chain config
      const chainConfig = getChainConfig(selectedToken.chainId)

      // Calculate bonding curve price using correct structure
      const currentSupply = Number(totalSupply) / 1e18 // Convert from wei
      let K = 0.0001; // Default fallback

      if (curve) {
        K = Number(curve.k) / 1e18; // Convert from wei
      }

      const FEE_RATE = 0.1; // 10% fee (hardcoded like server)

      console.log('Raw values:', {
        kRaw: curve?.k,
        totalSupplyRaw: totalSupply
      })
      console.log('Converted values:', { K, currentSupply, FEE_RATE })

      // Handle case where K is 0 (token not initialized)
      if (K === 0) {
        console.log('Token not initialized (K=0), using default pricing')
        const priceData: TokenPrice = {
          tokenAddress: selectedToken.address,
          tokenSymbol: symbol,
          chainId: selectedToken.chainId,
          currency: selectedToken.chainId === 167000 ? 'TAIKO' : (chainConfig?.currency || 'ETH'),
          currentSupply: currentSupply.toFixed(4),
          curveK: 0,
          feeRate: 0,
          priceForTokens: '0',
          pricePerToken: '0',
          tokensForOne: '0',
          networkName: chainConfig?.networkName || 'Unknown Network'
        }
        setTokenPrice(priceData)
        return
      }

      // Calculate price for 1 token using quadratic bonding curve
      const tokenAmount = 1
      const priceForTokens = getPriceForTokens(tokenAmount, currentSupply, K, FEE_RATE)
      const pricePerToken = tokenAmount > 0 ? priceForTokens / tokenAmount : 0
      const tokensForOne = getTokensForETH(1, currentSupply, K, FEE_RATE)

      const priceData: TokenPrice = {
        tokenAddress: selectedToken.address,
        tokenSymbol: symbol,
        chainId: selectedToken.chainId,
        currency: selectedToken.chainId === 167000 ? 'TAIKO' : (chainConfig?.currency || 'ETH'),
        currentSupply: currentSupply.toFixed(4),
        curveK: K,
        feeRate: FEE_RATE * 100, // Convert to percentage
        priceForTokens: priceForTokens.toFixed(8),
        pricePerToken: pricePerToken.toFixed(8),
        tokensForOne: tokensForOne.toFixed(4),
        networkName: chainConfig?.networkName || 'Unknown Network'
      }

      console.log('Calculated price data:', priceData)
      setTokenPrice(priceData)

    } catch (error) {
      console.error('Failed to fetch price using client RPC:', error)
      toast({
        title: "Price Error",
        description: "Failed to fetch token price",
        variant: "destructive"
      })
    } finally {
      setLoadingPrice(false)
    }
  }

  const fetchNativeCurrencyPrice = async () => {
    const chainConfig = getChainConfig(selectedChain)
    if (!chainConfig) return

    try {
      // Check if this is Monad testnet (chainId 10143)
      if (selectedChain === 10143) {
        // Use local price data for Monad testnet
        const response = await fetch('/prices/monadtestnet.json')
        const priceData = await response.json()
        const price = priceData.price || 0

        console.log(`Using local Monad testnet price: $${price}`)
        setNativeCurrencyPrice(price)
        return
      }

      // Fetch native currency price (ETH, APE, etc.) for other chains
      const currency = chainConfig.currency

      // Map currency symbols to CoinGecko IDs
      const coinGeckoId = currency === 'ETH' ? 'ethereum' :
        currency === 'APE' ? 'apecoin' :
          currency === 'MATIC' ? 'matic-network' :
            currency === 'OP' ? 'optimism' :
              currency === 'ARB' ? 'arbitrum' :
                currency === 'BASE' ? 'ethereum' : // Base uses ETH
                  'ethereum' // Default fallback

      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const price = data[coinGeckoId]?.usd || 0

      console.log(`Fetched ${currency} price: $${price}`)
      setNativeCurrencyPrice(price)
    } catch (error) {
      console.error("Error fetching native currency price:", error)
      // Set a fallback price or 0
      setNativeCurrencyPrice(0)
    }
  }

  const fetchTaikoTokenPrice = async () => {
    try {
      // Fetch TAIKO token price from CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=taiko&vs_currencies=usd', {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const price = data.taiko?.usd || 0

      console.log(`Fetched TAIKO token price: $${price}`)
      setTaikoTokenPrice(price)
    } catch (error) {
      console.error("Error fetching TAIKO token price:", error)
      // Set a fallback price or 0
      setTaikoTokenPrice(0)
    }
  }

  const fetchContractBalance = async () => {
    if (!selectedToken) return

    try {
      let balance: bigint
      let currencySymbol: string

      if (selectedToken.chainId === 167000) {
        // Taiko chain - get TAIKO token balance of the contract
        // Create a dedicated Taiko client to read from Taiko network
        const taikoClient = createPublicClient({
          transport: http('https://rpc.taiko.xyz')
        })

        balance = await taikoClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: TAIKO_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [selectedToken.address as `0x${string}`]
        })
        currencySymbol = 'TAIKO'
      } else {
        // Other chains - get native currency balance of the token contract
        if (!publicClient) return

        balance = await publicClient.getBalance({
          address: selectedToken.address as `0x${string}`
        })
        currencySymbol = selectedToken.currency
      }

      // Convert from wei to currency units
      const balanceInCurrency = Number(balance) / 1e18
      setContractBalance(balanceInCurrency)

      console.log(`Contract ${currencySymbol} balance: ${balanceInCurrency.toFixed(6)}`)
    } catch (error) {
      console.error("Error fetching contract balance:", error)
      setContractBalance(0)
    }
  }

  const fetchUserBalance = async () => {
    if (!selectedToken || !address) return

    try {
      let balance: bigint
      let currencySymbol: string

      if (selectedToken.chainId === 167000) {
        // Taiko chain - get user's TAIKO token balance
        // Create a dedicated Taiko client to read from Taiko network
        const taikoClient = createPublicClient({
          transport: http('https://rpc.taiko.xyz')
        })

        balance = await taikoClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: TAIKO_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        })
        currencySymbol = 'TAIKO'
      } else {
        // Other chains - get user's native currency balance
        if (!publicClient) return

        balance = await publicClient.getBalance({
          address: address as `0x${string}`
        })
        currencySymbol = selectedToken.currency
      }

      // Convert from wei to currency units
      const balanceInCurrency = Number(balance) / 1e18
      setUserBalance(balanceInCurrency)

      console.log(`User ${currencySymbol} balance: ${balanceInCurrency.toFixed(6)}`)
    } catch (error) {
      console.error("Error fetching user balance:", error)
      setUserBalance(0)
    }
  }

  const generateChartData = () => {
    if (!tokenPrice) return

    const basePrice = parseFloat(tokenPrice.pricePerToken)
    const data: ChartData[] = []
    const now = new Date()

    // Generate mock candlestick data for historical context
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000) // Hourly data
      const volatility = 0.1 + Math.random() * 0.2 // 10-30% volatility
      const change = (Math.random() - 0.5) * volatility

      const open = basePrice * (1 + change)
      const close = open * (1 + (Math.random() - 0.5) * 0.1)
      const high = Math.max(open, close) * (1 + Math.random() * 0.05)
      const low = Math.min(open, close) * (1 - Math.random() * 0.05)
      const volume = Math.random() * 1000000

      data.push({
        time: time.toISOString().slice(11, 16), // HH:MM format
        open,
        high,
        low,
        close,
        volume
      })
    }

    // Combine historical data with real transaction data
    const combinedData = [...data, ...transactionHistory]
    setChartData(combinedData)
  }

  const calculateMarketCap = () => {
    if (!tokenPrice) return 0

    // For Taiko chain, use TAIKO token price
    const currencyPrice = selectedToken?.chainId === 167000 ? taikoTokenPrice : nativeCurrencyPrice
    if (!currencyPrice) return 0

    // Market Cap = Current Supply ? Price Per Token ? Currency Price (USD)
    const currentSupply = parseFloat(tokenPrice.currentSupply)
    const pricePerToken = parseFloat(tokenPrice.pricePerToken)
    return currentSupply * pricePerToken * currencyPrice
  }

  const calculateFDV = () => {
    if (!tokenPrice) return 0

    // For Taiko chain, use TAIKO token price
    const currencyPrice = selectedToken?.chainId === 167000 ? taikoTokenPrice : nativeCurrencyPrice
    if (!currencyPrice) return 0

    // FDV = Current Supply ? Price Per Token ? Currency Price (USD)
    // For bonding curve tokens, FDV is the same as Market Cap since supply is dynamic
    const currentSupply = parseFloat(tokenPrice.currentSupply)
    const pricePerToken = parseFloat(tokenPrice.pricePerToken)
    return currentSupply * pricePerToken * currencyPrice
  }

  const calculateLiquidityValue = () => {
    if (!contractBalance) return 0

    // For Taiko chain, use TAIKO token price
    if (selectedToken?.chainId === 167000) {
      if (!taikoTokenPrice) return 0
      return contractBalance * taikoTokenPrice
    }

    // For other chains, use native currency price
    if (!nativeCurrencyPrice) return 0

    // Liquidity Value = Contract Balance (in native currency) ? Native Currency Price (USD)
    // This represents the total value locked in the contract
    return contractBalance * nativeCurrencyPrice
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSwitchNetwork = async () => {
    if (!switchChain) {
      toast({
        title: "Error",
        description: "Network switching is not supported by your wallet",
        variant: "destructive"
      })
      return
    }

    try {
      await switchChain({ chainId: selectedChain })
      toast({
        title: "Success",
        description: "Network switched successfully",
      })
      setShowNetworkMismatch(false)
    } catch (error) {
      console.error("Error switching network:", error)
      toast({
        title: "Error",
        description: "Failed to switch network. Please switch manually in your wallet.",
        variant: "destructive"
      })
    }
  }

  const filteredTokens = tokens.filter(token => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.networkName.toLowerCase().includes(query) ||
      token.currency.toLowerCase().includes(query)
    )
  })

  const executeBuyTransaction = async () => {
    if (!selectedToken || !tokenPrice || !walletClient || !publicClient || !address) {
      toast({
        title: "Error",
        description: "Missing required data for transaction",
        variant: "destructive"
      })
      return
    }

    try {
      setIsExecuting(true)

      const nativeAmount = parseEther(tradeAmount.toString())

      // Use binary search to find optimal token amount
      let low = BigInt(0)
      let high = parseEther("1000000")
      let bestTokenAmount = BigInt(0)
      let bestCost = BigInt(0)

      for (let i = 0; i < 50; i++) {
        const mid = (low + high) / BigInt(2)

        try {
          const cost = await publicClient.readContract({
            address: selectedToken.address as `0x${string}`,
            abi: TOKEN_ABI,
            functionName: 'previewMint',
            args: [mid]
          })

          if (cost <= nativeAmount) {
            bestTokenAmount = mid
            bestCost = cost
            low = mid + BigInt(1)
          } else {
            high = mid - BigInt(1)
          }

          if (high <= low) break
        } catch (error) {
          console.error('Error in binary search:', error)
          break
        }
      }

      if (bestTokenAmount === BigInt(0)) {
        toast({
          title: "Insufficient Amount",
          description: "Amount too small to mint any tokens",
          variant: "destructive"
        })
        return
      }

      // Check if this is Taiko chain (167000) - use TAIKO ERC-20 token
      if (selectedToken.chainId === 167000) {
        // Taiko chain - use TAIKO ERC-20 token for minting

        // Check TAIKO token balance
        const taikoBalance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: TAIKO_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        })

        if (taikoBalance < bestCost) {
          toast({
            title: "Insufficient TAIKO",
            description: `Need ${(Number(bestCost) / 1e18).toFixed(6)} TAIKO but you have ${(Number(taikoBalance) / 1e18).toFixed(6)} TAIKO`,
            variant: "destructive"
          })
          return
        }

        // Check allowance - approve to TOKEN contract (not router), matching browse page pattern
        const currentAllowance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: TAIKO_TOKEN_ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, selectedToken.address as `0x${string}`]
        })

        // Only approve if current allowance is insufficient
        if (currentAllowance < bestCost) {
          toast({
            title: "Approving TAIKO",
            description: "Approving TAIKO token spending...",
          })

          // Approve a larger amount to avoid frequent approvals and save gas
          // This allows multiple transactions without needing approval each time
          const approvalAmount = bestCost * BigInt(10) // Approve 10x the needed amount for future transactions

          const approveHash = await walletClient.writeContract({
            address: TAIKO_TOKEN_ADDRESS,
            abi: TAIKO_TOKEN_ABI,
            functionName: 'approve',
            args: [selectedToken.address as `0x${string}`, approvalAmount],
            gas: BigInt(100000),
          })

          // Wait for approval
          await publicClient.waitForTransactionReceipt({ hash: approveHash })

          toast({
            title: "TAIKO Approved",
            description: "Approval successful! Proceeding with transaction...",
          })
        }

        // Execute mintWithTaiko transaction directly on TOKEN contract (matching browse page pattern)
        const hash = await walletClient.writeContract({
          address: selectedToken.address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'mintWithTaiko',
          args: [bestTokenAmount, address as `0x${string}`],
          gas: BigInt(1000000),
        })

      } else {
        // Other chains - use native currency (ETH, MATIC, etc.)
        const hash = await walletClient.writeContract({
          address: selectedToken.routerAddress as `0x${string}`,
          abi: ROUTER_ABI,
          functionName: 'mint',
          args: [bestTokenAmount, address as `0x${string}`],
          value: bestCost,
          gas: BigInt(1000000),
        })
      }

      // Log transaction for chart data
      const actualTokenAmount = Number(bestTokenAmount) / 1e18
      const actualCost = Number(bestCost) / 1e18

      const newCandle: ChartData = {
        time: new Date().toISOString().slice(11, 16),
        open: parseFloat(tokenPrice.pricePerToken),
        high: parseFloat(tokenPrice.pricePerToken) * 1.01, // Slight increase
        low: parseFloat(tokenPrice.pricePerToken) * 0.99, // Slight decrease
        close: parseFloat(tokenPrice.pricePerToken) * 1.005, // Green candle (price up)
        volume: actualTokenAmount
      }

      setTransactionHistory(prev => [...prev, newCandle])

      toast({
        title: "Buy Successful!",
        description: `Bought ${actualTokenAmount.toFixed(6)} ${selectedToken.symbol} for ${actualCost.toFixed(6)} ${selectedToken.currency}`,
      })

      // Refresh price data
      await fetchTokenPrice()

    } catch (error) {
      console.error('Buy transaction error:', error)
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const executeSellTransaction = async () => {
    if (!selectedToken || !tokenPrice || !walletClient || !publicClient || !address) {
      toast({
        title: "Error",
        description: "Missing required data for transaction",
        variant: "destructive"
      })
      return
    }

    try {
      setIsExecuting(true)

      const tokenAmountIn = parseEther(tradeAmount.toString())

      // First, check if the contract has sufficient liquidity and get bonding curve parameters
      let contractBalance: bigint

      // Special handling for Taiko chain (167000) - check TAIKO token balance
      if (selectedToken.chainId === 167000) {

        contractBalance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: TAIKO_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [selectedToken.address as `0x${string}`]
        })
      } else {
        contractBalance = await publicClient.getBalance({
          address: selectedToken.address as `0x${string}`
        })
      }

      const [totalSupply, curve] = await Promise.all([
        publicClient.readContract({
          address: selectedToken.address as `0x${string}`,
          abi: [
            {
              "inputs": [],
              "name": "totalSupply",
              "outputs": [{ "internalType": "uint256", "name": "result", "type": "uint256" }],
              "stateMutability": "view",
              "type": "function"
            }
          ],
          functionName: 'totalSupply'
        }).catch(() => BigInt(0)),
        publicClient.readContract({
          address: selectedToken.address as `0x${string}`,
          abi: [
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
            }
          ],
          functionName: 'curve'
        }).catch(() => null)
      ])

      if (contractBalance === BigInt(0)) {
        toast({
          title: "Sell Failed",
          description: "Contract has no liquidity available for redemption",
          variant: "destructive"
        })
        setIsExecuting(false)
        return
      }

      // Get bonding curve parameters
      const currentSupply = Number(totalSupply) / 1e18
      let curveK = 0.0001 // Default fallback

      if (curve) {
        curveK = Number(curve.k) / 1e18
      }

      console.log(`Sell validation - Current supply: ${currentSupply}, Curve K: ${curveK}, Contract balance: ${Number(contractBalance) / 1e18}`)

      // Check user's token balance
      const userBalance = await publicClient.readContract({
        address: selectedToken.address as `0x${string}`,
        abi: [
          {
            "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'balanceOf',
        args: [address as `0x${string}`]
      })

      const userBalanceNum = Number(userBalance) / 1e18
      console.log(`User balance: ${userBalanceNum} ${selectedToken.symbol}, trying to sell: ${tradeAmount}`)

      if (userBalanceNum < Number.parseFloat(tradeAmount)) {
        toast({
          title: "Sell Failed",
          description: `Insufficient token balance. You have ${userBalanceNum.toFixed(6)} ${selectedToken.symbol} but trying to sell ${tradeAmount}`,
          variant: "destructive"
        })
        setIsExecuting(false)
        return
      }

      // Validate redemption amount with proper bonding curve math
      const validation = validateRedemptionAmount(Number.parseFloat(tradeAmount), contractBalance, totalSupply, currentSupply, curveK, userBalanceNum)
      if (!validation.isValid) {
        toast({
          title: "Sell Failed",
          description: validation.reason || "Invalid sell amount",
          variant: "destructive"
        })
        setIsExecuting(false)
        return
      }

      // Preview how much native currency we'll get
      const previewOut = await publicClient.readContract({
        address: selectedToken.address as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'previewRedeem',
        args: [tokenAmountIn]
      })

      const minOut = (previewOut * BigInt(95)) / BigInt(100) // 5% slippage

      // Execute redeem transaction - different logic for Taiko chain
      let hash: string

      if (selectedToken.chainId === 167000) {
        // Taiko chain - use redeemWithTaiko to get TAIKO tokens back (matching browse page pattern)
        hash = await walletClient.writeContract({
          address: selectedToken.address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'redeemWithTaiko',
          args: [tokenAmountIn, address as `0x${string}`, address as `0x${string}`, minOut],
          gas: BigInt(500000),
        })
      } else {
        // Other chains - use standard redeem for native currency
        hash = await walletClient.writeContract({
          address: selectedToken.address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'redeem',
          args: [tokenAmountIn, address as `0x${string}`, address as `0x${string}`, minOut],
          gas: BigInt(500000),
        })
      }

      // Log transaction for chart data
      const actualNativeOut = Number(previewOut) / 1e18

      const newCandle: ChartData = {
        time: new Date().toISOString().slice(11, 16),
        open: parseFloat(tokenPrice.pricePerToken),
        high: parseFloat(tokenPrice.pricePerToken) * 1.01,
        low: parseFloat(tokenPrice.pricePerToken) * 0.99,
        close: parseFloat(tokenPrice.pricePerToken) * 0.995, // Red candle (price down)
        volume: parseFloat(tradeAmount)
      }

      setTransactionHistory(prev => [...prev, newCandle])

      toast({
        title: "Sell Successful!",
        description: `Sold ${tradeAmount} ${selectedToken.symbol} for ${actualNativeOut.toFixed(6)} ${selectedToken.currency}`,
      })

      // Refresh price data
      await fetchTokenPrice()

    } catch (error: any) {
      console.error('Error executing sell transaction:', error)

      let errorMessage = "Sell transaction failed"
      if (error.message?.includes('underflow') || error.message?.includes('overflow') ||
        error.message?.includes('Arithmetic operation resulted in underflow or overflow')) {
        errorMessage = "Insufficient liquidity for this sell amount"
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = "Insufficient funds for transaction"
      } else if (error.message?.includes('user rejected')) {
        errorMessage = "Transaction rejected by user"
      }

      toast({
        title: "Sell Failed",
        description: errorMessage,
        variant: "destructive"
      })

      // Only log errors that aren't user cancellations
      if (shouldLogError(error)) {
        console.error('Sell transaction error:', error)
      }

      // Get user-friendly error message
      const errorInfo = getTransactionErrorMessage(error)

      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: errorInfo.variant
      })
    } finally {
      setIsExecuting(false)
    }
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
      }`}>
      <BidBopHeader />

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Network Mismatch Warning */}
        {showNetworkMismatch && address && (
          <div className={`mb-4 p-4 rounded-lg border-2 ${isDarkMode
            ? 'bg-red-900/20 border-red-500/50'
            : 'bg-red-50 border-red-200'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-red-500 text-xl">??</div>
                <div>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'
                    }`}>
                    Wrong Network
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'
                    }`}>
                    Your wallet is connected to {connectedChain?.name || 'a different network'}. Please switch to {getChainConfig(selectedChain)?.networkName || 'the selected network'}.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSwitchNetwork}
                className={`${isDarkMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
              >
                Switch Network
              </Button>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                Trading Hub
              </h1>
              <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                Real-time trading with bonding curve pricing
              </p>
            </div>

            {/* Chain Selector */}
            <div className="flex items-center space-x-3">
              <Select value={selectedChain.toString()} onValueChange={(value) => setSelectedChain(parseInt(value))}>
                <SelectTrigger className={`w-48 ${isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-800'
                  }`}>
                  <SelectValue placeholder="Select Chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ethereum Mainnet</SelectItem>
                  <SelectItem value="10">Optimism Mainnet</SelectItem>
                  <SelectItem value="42161">Arbitrum One</SelectItem>
                  <SelectItem value="8453">Base Mainnet</SelectItem>
                  <SelectItem value="33139">Apechain Mainnet</SelectItem>
                  <SelectItem value="167000">Taiko Alethia</SelectItem>
                  <SelectItem value="10143">Monad Testnet</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchTokens}
                disabled={loading}
                className={`${isDarkMode
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Token List */}
          <div className="xl:col-span-1">
            <Card className={`backdrop-blur-sm shadow-sm rounded-2xl ${isDarkMode
              ? 'bg-gray-800/70 border-gray-700/60'
              : 'bg-white/70 border-gray-200/60'
              }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                    Available Tokens
                  </CardTitle>
                  <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    {filteredTokens.length} of {tokens.length}
                  </div>
                </div>
                <div className="relative mt-3">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  <Input
                    type="text"
                    placeholder="Search tokens..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-200 text-gray-800 placeholder-gray-500'
                      }`}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredTokens.length === 0 ? (
                        <div className="p-4 text-center">
                          <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            No tokens found matching "{searchQuery}"
                          </div>
                        </div>
                      ) : (
                        filteredTokens.map((token) => (
                          <div
                            key={token.address}
                            onClick={() => setSelectedToken(token)}
                            className={`p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${selectedToken?.address === token.address
                              ? isDarkMode
                                ? 'bg-purple-600/20 border-l-4 border-purple-500'
                                : 'bg-purple-100/50 border-l-4 border-purple-500'
                              : isDarkMode
                                ? 'hover:bg-gray-700/50'
                                : 'hover:bg-gray-50'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {token.imageUrl ? (
                                  <img
                                    src={token.imageUrl}
                                    alt={token.symbol}
                                    className="w-8 h-8 rounded-full"
                                  />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDarkMode
                                    ? 'bg-gradient-to-br from-purple-600 to-pink-600'
                                    : 'bg-gradient-to-br from-purple-100 to-pink-100'
                                    }`}>
                                    {token.symbol.slice(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                    }`}>
                                    {token.symbol}
                                  </div>
                                  <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                    {token.name}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                  }`}>
                                  {token.networkName}
                                </div>
                                <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  {token.currency}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chart and Trading */}
          <div className="xl:col-span-2 space-y-6">
            {selectedToken && (
              <>
                {/* Token Info Header */}
                <Card className={`backdrop-blur-sm shadow-sm rounded-2xl ${isDarkMode
                  ? 'bg-gray-800/70 border-gray-700/60'
                  : 'bg-white/70 border-gray-200/60'
                  }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        {selectedToken.imageUrl ? (
                          <img
                            src={selectedToken.imageUrl}
                            alt={selectedToken.symbol}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isDarkMode
                            ? 'bg-gradient-to-br from-purple-600 to-pink-600'
                            : 'bg-gradient-to-br from-purple-100 to-pink-100'
                            }`}>
                            {selectedToken.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <h2 className={`text-xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                            }`}>
                            {selectedToken.symbol}
                          </h2>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                              {selectedToken.name}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0"
                              onClick={() => copyToClipboard(selectedToken.address, 'address')}
                            >
                              {copied === 'address' ? (
                                <span className="text-emerald-600 text-xs">?</span>
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                          {loadingPrice ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                              <span>Loading...</span>
                            </div>
                          ) : tokenPrice ? (
                            `${tokenPrice.pricePerToken} ${tokenPrice.currency}`
                          ) : (
                            'No data'
                          )}
                        </div>
                        <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                          {tokenPrice && (
                            <div>1 {selectedToken?.symbol} = {tokenPrice.pricePerToken} {tokenPrice.currency}</div>
                          )}
                          <div>Market Cap: ${calculateMarketCap().toFixed(2)}</div>
                          <div>Liquidity: ${calculateLiquidityValue().toFixed(2)}</div>
                          {contractBalance > 0 && nativeCurrencyPrice > 0 && (
                            <div className="text-xs opacity-75">
                              Contract holds: {contractBalance.toFixed(4)} {selectedToken?.chainId === 167000 ? 'TAIKO' : selectedToken?.currency} (? ${nativeCurrencyPrice.toFixed(2)})
                            </div>
                          )}
                          {userBalance > 0 && (
                            <div className="text-xs opacity-75">
                              Your balance: {userBalance.toFixed(4)} {selectedToken?.chainId === 167000 ? 'TAIKO' : selectedToken?.currency}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                        }`}>
                        <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          Supply
                        </div>
                        <div className={`text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                          {loadingPrice ? '...' : tokenPrice ? parseFloat(tokenPrice.currentSupply).toFixed(2) : 'N/A'}
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                        }`}>
                        <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          Curve K
                        </div>
                        <div className={`text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                          {loadingPrice ? '...' : tokenPrice ? tokenPrice.curveK.toFixed(6) : 'N/A'}
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                        }`}>
                        <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          Fee Rate
                        </div>
                        <div className={`text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                          {loadingPrice ? '...' : tokenPrice ? `${tokenPrice.feeRate}%` : 'N/A'}
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                        }`}>
                        <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          Contract Balance
                        </div>
                        <div className={`text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                          {contractBalance.toFixed(4)} {selectedToken.currency}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>


                {/* Trading Interface */}
                <Card className={`backdrop-blur-sm shadow-sm rounded-2xl ${isDarkMode
                  ? 'bg-gray-800/70 border-gray-700/60'
                  : 'bg-white/70 border-gray-200/60'
                  }`}>
                  <CardHeader>
                    <CardTitle className={`text-lg transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                      Trade {selectedToken.symbol}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={tradeType} onValueChange={(value) => setTradeType(value as "buy" | "sell")}>
                      <TabsList className={`grid w-full grid-cols-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                        <TabsTrigger
                          value="buy"
                          className={`${tradeType === 'buy'
                            ? isDarkMode
                              ? 'bg-green-600 text-white'
                              : 'bg-green-100 text-green-700'
                            : ''
                            }`}
                        >
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          Buy
                        </TabsTrigger>
                        <TabsTrigger
                          value="sell"
                          className={`${tradeType === 'sell'
                            ? isDarkMode
                              ? 'bg-red-600 text-white'
                              : 'bg-red-100 text-red-700'
                            : ''
                            }`}
                        >
                          <ArrowDownRight className="h-4 w-4 mr-2" />
                          Sell
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="buy" className="mt-6">
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                              Amount ({selectedToken.currency})
                            </label>
                            <Input
                              type="number"
                              placeholder="0.0"
                              value={tradeAmount}
                              onChange={(e) => setTradeAmount(e.target.value)}
                              className={`${isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-200 text-gray-800'
                                }`}
                            />
                          </div>

                          {tradeAmount && tokenPrice && (
                            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                              }`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  You will receive:
                                </span>
                                <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                  }`}>
                                  {getTokensForETH(parseFloat(tradeAmount), parseFloat(tokenPrice.currentSupply), tokenPrice.curveK, tokenPrice.feeRate / 100).toFixed(4)} {selectedToken.symbol}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  Price per token:
                                </span>
                                <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                  }`}>
                                  {tokenPrice.pricePerToken} {tokenPrice.currency}
                                </span>
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={executeBuyTransaction}
                            className={`w-full ${isDarkMode
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
                              : 'bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 text-green-700 hover:text-green-800'
                              }`}
                            disabled={!tradeAmount || !address || isExecuting || !tokenPrice}
                          >
                            {isExecuting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Buying...
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                {address ? 'Buy Tokens' : 'Connect Wallet'}
                              </>
                            )}
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="sell" className="mt-6">
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                              Amount ({selectedToken.symbol})
                            </label>
                            <Input
                              type="number"
                              placeholder="0.0"
                              value={tradeAmount}
                              onChange={(e) => setTradeAmount(e.target.value)}
                              className={`${isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-200 text-gray-800'
                                }`}
                            />
                          </div>

                          {tradeAmount && tokenPrice && (
                            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                              }`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  You will receive:
                                </span>
                                <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                  }`}>
                                  {getPriceForTokens(parseFloat(tradeAmount), parseFloat(tokenPrice.currentSupply), tokenPrice.curveK, tokenPrice.feeRate / 100).toFixed(6)} {selectedToken.currency}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  Price per token:
                                </span>
                                <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                  }`}>
                                  {tokenPrice.pricePerToken} {tokenPrice.currency}
                                </span>
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={executeSellTransaction}
                            className={`w-full ${isDarkMode
                              ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500'
                              : 'bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 text-red-700 hover:text-red-800'
                              }`}
                            disabled={!tradeAmount || !address || isExecuting || !tokenPrice}
                          >
                            {isExecuting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Selling...
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                {address ? 'Sell Tokens' : 'Connect Wallet'}
                              </>
                            )}
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Transaction History */}
                {transactionHistory.length > 0 && (
                  <Card className={`backdrop-blur-sm shadow-sm rounded-2xl ${isDarkMode
                    ? 'bg-gray-800/70 border-gray-700/60'
                    : 'bg-white/70 border-gray-200/60'
                    }`}>
                    <CardHeader>
                      <CardTitle className={`text-lg transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                        Recent Trades
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {transactionHistory.slice(-10).reverse().map((trade, index) => {
                          const isGreen = trade.close > trade.open
                          return (
                            <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                              }`}>
                              <div className="flex items-center space-x-3">
                                <div className={`w-2 h-2 rounded-full ${isGreen ? 'bg-green-500' : 'bg-red-500'
                                  }`}></div>
                                <span className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                                  }`}>
                                  {isGreen ? 'BUY' : 'SELL'}
                                </span>
                                <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  {trade.time}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-semibold transition-colors duration-300 ${isGreen ? 'text-green-500' : 'text-red-500'
                                  }`}>
                                  {trade.close.toFixed(6)} {selectedToken.currency}
                                </div>
                                <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  Vol: {trade.volume.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <BidBopFooter />
    </div>
  )
}
