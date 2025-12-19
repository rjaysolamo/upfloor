"use client"

import Image from "next/image"
import Link from "next/link"
import { SwapWidget } from "@/components/swap-widget"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useBalance, usePublicClient, useChainId } from "wagmi"
import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Wallet, Activity, Star, Clock, Users } from "lucide-react"
import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import { useTheme } from "@/components/theme-provider"
import { chainConfigs } from "@/lib/chainlist"

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

// User token holdings type
type UserToken = {
  address: string
  symbol: string
  name: string
  balance: number
  imageUrl?: string
  chainId: number
  networkName: string
  currency: string
}

const dummyHoldings = [
  { symbol: "ETH", amount: 1.42, usd: 4544.0, change24h: 2.3, icon: "⟠" },
  { symbol: "BOP", amount: 8200, usd: 10086.0, change24h: -1.2, icon: "🎯" },
  { symbol: "USDC", amount: 2500, usd: 2500.0, change24h: 0.1, icon: "💵" },
  { symbol: "USDT", amount: 1200, usd: 1200.0, change24h: 0.0, icon: "💰" },
]

// Collection type for live auctions
type Collection = {
  id: number
  collection_name: string
  token_symbol: string
  collection_image: string | null
  token_address: string
  chain_id: number
  created_at: string
  deployer_address: string
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

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [userTokens, setUserTokens] = useState<UserToken[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [tokenPrices, setTokenPrices] = useState<{ [key: string]: number }>({})
  const [collectionProgress, setCollectionProgress] = useState<{ [key: string]: CollectionProgress }>({})
  const { isDarkMode } = useTheme()
  
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: ethBalance } = useBalance({
    address: address,
  })
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch collections for live auctions
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoadingCollections(true)
        const response = await fetch('/api/collections')
        if (!response.ok) {
          throw new Error('Failed to fetch collections')
        }
        const data = await response.json()
        setCollections(data.collections || [])
        
        // Token prices will be populated by Trading Hub (SwapWidget)
      } catch (error) {
        console.error('Failed to fetch collections:', error)
      } finally {
        setLoadingCollections(false)
      }
    }

    fetchCollections()
  }, [publicClient])

  // Fetch token prices and progress when collections are loaded
  useEffect(() => {
    if (collections.length > 0 && publicClient) {
      fetchAllTokenPrices()
      fetchCollectionProgress()
    }
  }, [collections, publicClient])

  // Callback to receive token price from SwapWidget (Trading Hub)
  const handleTokenPriceUpdate = (tokenAddress: string, tokensForOne: number) => {
    // Convert tokensForOne to price of 1 token in native currency
    const priceOfOneToken = tokensForOne > 0 ? 1 / tokensForOne : 0
    
    setTokenPrices(prev => ({
      ...prev,
      [tokenAddress.toLowerCase()]: priceOfOneToken
    }))
    console.log(`Updated token price for ${tokenAddress}: 1 token = ${priceOfOneToken} native, or ${tokensForOne} tokens per 1 native`)
  }

  // Fetch token prices for all collections automatically
  const fetchAllTokenPrices = async () => {
    if (!publicClient || !collections.length) return

    console.log('Fetching token prices for all collections...')
    
    for (const collection of collections) {
      try {
        // Get token contract data using client RPC
        const [totalSupply, curve] = await Promise.all([
          publicClient.readContract({
            address: collection.token_address as `0x${string}`,
            abi: [
              {
                "inputs": [],
                "name": "totalSupply",
                "outputs": [{"internalType": "uint256", "name": "result", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: 'totalSupply'
          }).catch(() => BigInt(0)),
          publicClient.readContract({
            address: collection.token_address as `0x${string}`,
            abi: [
              {
                "inputs": [],
                "name": "curve",
                "outputs": [
                  {
                    "components": [
                      {"internalType": "uint128", "name": "p0", "type": "uint128"},
                      {"internalType": "uint128", "name": "k", "type": "uint128"}
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

        const currentSupply = Number(totalSupply) / 1e18
        let K = 0.0001 // Default fallback
        
        if (curve) {
          K = Number(curve.k) / 1e18
        }

        if (K === 0) {
          console.log(`Token ${collection.token_symbol} not initialized (K=0)`)
          continue
        }

        const FEE_RATE = 0.1 // 10% fee
        const tokensForOne = getTokensForETH(1, currentSupply, K, FEE_RATE)
        
        // Calculate price of 1 token in native currency
        const priceOfOneToken = tokensForOne > 0 ? 1 / tokensForOne : 0
        
        // Update token price (store price of 1 token in native currency)
        setTokenPrices(prev => ({
          ...prev,
          [collection.token_address.toLowerCase()]: priceOfOneToken
        }))
        
        console.log(`Fetched price for ${collection.token_symbol}: 1 token = ${priceOfOneToken} native, or ${tokensForOne} tokens per 1 native`)
        
      } catch (error) {
        console.error(`Error fetching price for ${collection.token_symbol}:`, error)
      }
    }
  }

  // Fetch collection progress data (pool balance and target amount)
  const fetchCollectionProgress = async () => {
    if (!publicClient || !collections.length) return

    console.log('Fetching collection progress data...', { collectionsCount: collections.length })
    
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
        // Get the pool balance (native currency balance of the token contract)
        console.log(`Fetching balance for ${collection.token_address}`)
        const poolBalance = await publicClient.getBalance({
          address: collection.token_address as `0x${string}`
        })

        const poolBalanceInNative = Number(poolBalance) / 1e18
        console.log(`Pool balance for ${collection.token_symbol}: ${poolBalanceInNative} ${getChainCurrency(collection.chain_id)}`)
        
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
          progressPercentage = Math.min((poolBalanceInNative / targetAmount) * 100, 100)
        }
        
        // Update progress data
        setCollectionProgress(prev => ({
          ...prev,
          [tokenAddress]: {
            tokenAddress,
            poolBalance: poolBalanceInNative,
            targetAmount,
            progressPercentage,
            isLoading: false
          }
        }))
        
        console.log(`✅ Progress for ${collection.token_symbol}: ${progressPercentage.toFixed(2)}% (${poolBalanceInNative.toFixed(4)} / ${targetAmount.toFixed(4)} ${getChainCurrency(collection.chain_id)})`)
        
      } catch (error) {
        console.error(`❌ Error fetching progress for ${collection.token_symbol}:`, error)
        
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

  // ERC20 ABI for balance checking
  const ERC20_ABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
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
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const

  // Fetch user's token holdings using client RPC
  useEffect(() => {
    const fetchUserTokens = async () => {
      if (!address || !isConnected || !publicClient || !chainId) {
        setUserTokens([])
        return
      }

      try {
        setLoadingTokens(true)
        console.log('Fetching user tokens using client RPC for chain:', chainId)
        
        // First, get tokens from database for this chain
        const response = await fetch(`/api/tokens?chainId=${chainId}`)
        const result = await response.json()
        
        if (!result.success) {
          console.error('Failed to fetch tokens from database')
          return
        }

        const dbTokens = result.data
        console.log(`Found ${dbTokens.length} tokens in database for chain ${chainId}`)

        // Get chain config
        const chainConfig = Object.values(chainConfigs).find(c => c.id === chainId)
        if (!chainConfig) {
          console.error('Chain config not found for chain:', chainId)
          return
        }

        // Check user's balance for each token using client RPC
        const userTokens: UserToken[] = []
        
        for (const token of dbTokens) {
          try {
            // Get user's balance for this token using client RPC
            const balance = await publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address as `0x${string}`]
            })

            const balanceNumber = Number(balance) / 1e18 // Convert from wei

            // Only include tokens with non-zero balance
            if (balanceNumber > 0) {
              // Get token symbol and name from contract using client RPC
              const [symbol, name] = await Promise.all([
                publicClient.readContract({
                  address: token.address as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: 'symbol'
                }).catch(() => token.symbol), // Fallback to database symbol
                publicClient.readContract({
                  address: token.address as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: 'name'
                }).catch(() => token.name) // Fallback to database name
              ])

              userTokens.push({
                address: token.address,
                symbol: symbol,
                name: name,
                balance: balanceNumber,
                imageUrl: token.imageUrl,
                chainId: token.chainId,
                networkName: token.networkName,
                currency: token.currency
              })

              console.log(`User owns ${balanceNumber} ${symbol} tokens`)
            }
          } catch (error) {
            console.error(`Error checking balance for token ${token.address}:`, error)
            // Continue with other tokens even if one fails
          }
        }

        console.log(`User owns ${userTokens.length} different tokens`)
        setUserTokens(userTokens)

      } catch (error) {
        console.error('Failed to fetch user tokens:', error)
      } finally {
        setLoadingTokens(false)
      }
    }

    fetchUserTokens()
  }, [address, isConnected, publicClient, chainId])

  const getCollectionAvatar = (collection: Collection) => {
    if (collection.collection_image) {
      return collection.collection_image
    }
    // Fallback to emoji based on symbol
    const emojiMap: { [key: string]: string } = {
      'XYZ': '🔷',
      'RNZO': '🔄',
      'JRKY': '🎯',
      'PNKSTR': '👤',
      'BORED': '🐵',
      'ART': '🎨',
      'DEFI': '⚡',
      'GAME': '🎮',
      'META': '🌐'
    }
    return emojiMap[collection.token_symbol] || '🪙'
  }

  const getChainCurrency = (chainId: number) => {
    // Special case for Taiko chain - use TAIKO token
    if (chainId === 167000) {
      return 'TAIKO'
    }
    const chain = chainConfigs[chainId as keyof typeof chainConfigs]
    return chain ? chain.currency : 'ETH'
  }

  const getTokenPriceEquivalent = (collection: Collection) => {
    if (!collection.floor_price) return null
    
    const tokenAddress = collection.token_address.toLowerCase()
    const priceOfOneToken = tokenPrices[tokenAddress] // Price of 1 token in native currency
    
    if (!priceOfOneToken || priceOfOneToken === 0) return null
    
    const floorPriceNum = parseFloat(collection.floor_price)
    // Correct calculation: floor price ÷ price of 1 token = how many tokens
    // Example: 20 APE ÷ 0.001 APE per token = 20,000 tokens
    const tokenEquivalent = floorPriceNum / priceOfOneToken
    
    return tokenEquivalent.toLocaleString(undefined, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 4 
    })
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-pink-400/20 via-blue-400/20 to-purple-400/20 rounded-full blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        {/* Cool Loading Animation */}
        <div className="relative z-10 text-center">
          {/* UpFloor.co Logo with Animation */}
          <div className="relative mb-8">
            <div className="text-6xl font-black mb-2">
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent animate-pulse">
                  UpFloor
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent blur-sm opacity-75 animate-pulse">
                  UpFloor
                </span>
              </span>
            </div>
            <p className="text-gray-600 text-lg font-medium">Loading your dashboard...</p>
          </div>

          {/* Cool Loading Dots */}
          <div className="flex justify-center space-x-2 mb-8">
            <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>

          {/* Progress Bar */}
          <div className="w-64 mx-auto">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full animate-pulse" style={{
                width: '100%',
                animation: 'progress 2s ease-in-out infinite'
              }}></div>
            </div>
          </div>

          {/* Loading Text */}
          <p className="text-gray-500 text-sm mt-4 animate-pulse">
            Preparing your DeFi command center.
          </p>
        </div>
      </main>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
    }`}>
      <BidBopHeader />
      <main>
      {/* Dashboard Header Section */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
          <div className="text-center">
            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                  <span className={`bg-clip-text text-transparent transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-white via-gray-200 to-gray-300' 
                      : 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600'
                  }`}>
                    Dashboard
                  </span>
                </h1>
                <p className={`text-xs sm:text-sm mt-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Your DeFi command center</p>
              </div>
              
              {/* Light & Nice Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Button asChild className="bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 h-8 sm:h-9 px-3 sm:px-5 rounded-xl font-medium text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] backdrop-blur-sm">
                      <Link href="/browse">Explore</Link>
                    </Button>
                <Button asChild className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 hover:text-purple-800 border border-purple-200 hover:border-purple-300 h-8 sm:h-9 px-3 sm:px-5 rounded-xl font-medium text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                      <Link href="/deploy">Create</Link>
                    </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compact Portfolio Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-2">
        <Card className={`border backdrop-blur-sm shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 ${
          isDarkMode 
            ? 'border-gray-700/60 bg-gray-800/70 hover:bg-gray-800/80' 
            : 'border-gray-200/60 bg-white/70 hover:bg-white/80'
        }`}>
          <CardHeader className={`pb-1 pt-2 transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/70' 
              : 'bg-gradient-to-r from-gray-50/50 to-blue-50/30'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xs font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>Portfolio</h2>
                <p className={`text-xs transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Your holdings</p>
          </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className={`text-xs font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-700'
                  }`}>Total</div>
                  <div className={`text-xs font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {userTokens.length > 0 ? `${userTokens.length} tokens` : 'No tokens'}
                </div>
                  </div>
                  <div className="text-right">
                  <div className={`text-xs font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-700'
                  }`}>24h</div>
                  <div className="text-xs text-emerald-600 flex items-center justify-end gap-1 font-medium">
                      <TrendingUp className="h-3 w-3" />
                    +2.3%
                  </div>
                    </div>
                <Button className={`h-5 px-2 rounded-md font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] text-xs ${
                  isDarkMode 
                    ? 'bg-gray-700/80 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-600 hover:border-gray-500' 
                    : 'bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300'
                }`}>
                  <Activity className="h-3 w-3 mr-1" />
                  View
                </Button>
                  </div>
                </div>
              </CardHeader>
          <CardContent className="p-1">
            {loadingTokens ? (
              <div className="flex flex-col items-center justify-center py-4">
                {/* Diamond Maze / Rubix Cube Style Loading */}
                <div className="relative mb-2">
                  {/* Outer diamond frame */}
                  <div className="w-8 h-8 border-2 border-purple-500/30 rotate-45 animate-spin" style={{animationDuration: '3s'}}></div>
                  
                  {/* Inner rotating squares */}
                  <div className="absolute inset-1 w-6 h-6 border-2 border-pink-500/50 rotate-45 animate-spin" style={{animationDuration: '2s', animationDirection: 'reverse'}}></div>
                  
                  {/* Center cube */}
                  <div className="absolute inset-2 w-4 h-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rotate-45 animate-pulse"></div>
                </div>
                
                <span className={`text-xs transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Loading tokens</span>
              </div>
            ) : userTokens.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                {userTokens.map((token) => (
                  <div key={token.address} className={`group flex items-center justify-between p-1.5 rounded-md border transition-all duration-200 hover:shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600/40 hover:border-purple-400/60 hover:bg-gray-700/70' 
                      : 'bg-white/50 border-gray-200/40 hover:border-purple-200/60 hover:bg-white/70'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs shadow-sm group-hover:scale-105 transition-transform duration-200 overflow-hidden">
                        {token.imageUrl ? (
                          <img 
                            src={token.imageUrl} 
                            alt={token.symbol}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <span className="text-xs font-bold text-gray-600">
                            {token.symbol.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className={`font-semibold text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>{token.symbol}</div>
                        <div className={`text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>Token</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold text-xs transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>{token.balance.toFixed(2)}</div>
                      <div className={`text-xs transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>{token.networkName}</div>
                      <div className="text-xs text-emerald-600 font-medium">
                        ✓ Owned
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className={`text-xs transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {isConnected ? 'No tokens found in your wallet' : 'Connect wallet to view tokens'}
                </div>
                <div className={`text-xs mt-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {isConnected ? 'Try minting some tokens first!' : 'Connect your wallet to see your portfolio'}
                </div>
              </div>
            )}
              </CardContent>
        </Card>
      </section>

      {/* Trading Hub and Live Auctions Side by Side */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Live Auctions */}
          <div>
        <div className="mb-4">
          <div className="flex items-center justify-between">
                <h2 className={`text-lg sm:text-xl font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>Live Strategies</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={`shadow-sm rounded-xl hover:scale-[1.02] transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-700/80 border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500' 
                      : 'bg-white/80 border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  View All
          </Button>
          </div>
        </div>

            {loadingCollections ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center">
                  {/* Diamond Maze / Rubix Cube Style Loading */}
                  <div className="relative mb-4">
                    <div className="w-8 h-8 border-2 border-purple-500/30 rotate-45 animate-spin" style={{animationDuration: '3s'}}></div>
                    <div className="absolute inset-1 w-6 h-6 border-2 border-pink-500/50 rotate-45 animate-spin" style={{animationDuration: '2s', animationDirection: 'reverse'}}></div>
                    <div className="absolute inset-2 w-4 h-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rotate-45 animate-pulse"></div>
                  </div>
                  <span className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Loading collections...</span>
                </div>
              </div>
            ) : collections.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {collections.slice(0, 2).map((collection) => (
                  <div key={collection.id} className={`flex-shrink-0 w-48 h-88 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group cursor-pointer overflow-hidden ${
                    isDarkMode 
                      ? 'bg-gray-800/70 border-gray-700/50 hover:bg-gray-800/80' 
                      : 'bg-white/70 border-gray-200/50 hover:bg-white/80'
                  }`}>
                    {/* Collection Image */}
                    <div className="relative h-32 overflow-hidden">
                      {collection.collection_image ? (
                        <Image
                          src={collection.collection_image}
                          alt={collection.collection_name}
                          width={192}
                          height={128}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-4xl">
                          {getCollectionAvatar(collection)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      <div className="absolute top-2 left-2">
                        <Badge className={`rounded-full px-2 py-1 text-xs font-medium shadow-sm ${
                          isDarkMode 
                            ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                            : 'bg-purple-100 text-purple-700 border border-purple-200'
                        }`}>
                          Live
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge className={`backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium shadow-sm ${
                          isDarkMode 
                            ? 'bg-gray-700/80 text-gray-300 border border-gray-600' 
                            : 'bg-white/80 text-gray-700 border border-gray-200'
                        }`}>
                          <Clock className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Collection Info */}
                    <div className="p-3 flex flex-col justify-between h-56">
                      <div className="space-y-2">
                        <h3 className={`font-semibold text-xs line-clamp-1 transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>{collection.collection_name}</h3>
                        <div className={`flex items-center justify-between text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>Chain {collection.chain_id}</span>
                          </div>
                          <span>${collection.token_symbol}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>Floor Price</span>
                          <span className={`font-semibold text-xs transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-gray-800'
                            }`}>
                              {collection.floor_price 
                                ? `${parseFloat(collection.floor_price).toFixed(0)} ${getChainCurrency(collection.chain_id)}` 
                                : 'N/A'}
                            </span>
                          </div>
                          {getTokenPriceEquivalent(collection) && (
                            <div className="flex items-center justify-end">
                              <span className={`text-xs italic transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                ≈ {getTokenPriceEquivalent(collection)} ${collection.token_symbol}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={`text-xs transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>Supply</span>
                          <span className={`font-semibold text-xs transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                            {collection.total_supply 
                              ? collection.total_supply.toLocaleString() 
                              : 'N/A'}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        {(() => {
                          const progress = collectionProgress[collection.token_address.toLowerCase()]
                          console.log(`Progress data for ${collection.token_symbol}:`, progress)
                          
                          if (!progress || progress.isLoading) {
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs transition-colors duration-300 ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                  }`}>Progress</span>
                                  <span className={`text-xs transition-colors duration-300 ${
                                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                  }`}>Loading...</span>
                                </div>
                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                                }`}>
                                  <div className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse`} style={{width: '30%'}}></div>
                                </div>
                              </div>
                            )
                          }
                          
                          // Show progress even if target amount is 0 (no floor price or supply data)
                          const hasValidTarget = progress.targetAmount > 0
                          const displayPercentage = hasValidTarget ? progress.progressPercentage : 0
                          
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs transition-colors duration-300 ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>Progress</span>
                                <span className={`text-xs font-medium transition-colors duration-300 ${
                                  !hasValidTarget 
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
                              <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                              }`}>
                                <div 
                                  className={`h-full transition-all duration-500 ease-out ${
                                    !hasValidTarget
                                      ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                                      : displayPercentage >= 100 
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                                        : displayPercentage >= 50 
                                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                          : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                  }`} 
                                  style={{width: `${Math.min(displayPercentage, 100)}%`}}
                                ></div>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className={`transition-colors duration-300 ${
                                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                  {progress.poolBalance.toFixed(4)} {getChainCurrency(collection.chain_id)}
                                </span>
                                <span className={`transition-colors duration-300 ${
                                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                  {hasValidTarget ? `/ ${progress.targetAmount.toFixed(4)} ${getChainCurrency(collection.chain_id)}` : 'No target set'}
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                        
                        <Button 
                          asChild
                          className={`w-full font-medium h-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] text-xs ${
                            isDarkMode 
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border border-purple-500 hover:border-purple-400' 
                              : 'bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 hover:text-purple-800 border border-purple-200 hover:border-purple-300'
                          }`}
                        >
                          <Link href={`/collections/${collection.token_symbol.toLowerCase()}`}>
                            View Collection
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No collections available
                </div>
                <div className={`text-xs mt-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Collections will appear here once deployed
                </div>
              </div>
            )}
          </div>

          {/* Trading Hub */}
          <div className="flex justify-start">
            <div className="w-full max-w-md">
              <SwapWidget defaultOut="BOP" onPriceUpdate={handleTokenPriceUpdate} />
            </div>
          </div>
        </div>
      </section>

    </main>
      <BidBopFooter />
    </div>
  )
}
