"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getTransactionErrorMessage, shouldLogError } from "@/lib/transaction-errors"
import { ArrowUpDown, Settings, ChevronDown, Loader2 } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useAccount, useChainId, useWalletClient, usePublicClient } from "wagmi"
import { chainConfigs, getExplorerUrl } from "@/lib/chainlist"
import { parseEther } from "viem"

// UPFLOOR Token ABI (for Taiko chain 167000)
const UPFLOOR_TOKEN_ABI = [
  // View Functions
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "previewMint",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
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
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "taikoPaymentToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "effectiveSupply",
    "outputs": [{ "internalType": "uint256", "name": "effective", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lockedSupply",
    "outputs": [{ "internalType": "uint256", "name": "locked", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "surplus",
    "outputs": [{ "internalType": "uint256", "name": "surplusAmount", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
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
  // Write Functions
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "address", "name": "receiver", "type": "address" }],
    "name": "mintWithTaiko",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "address", "name": "receiver", "type": "address" }],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "minOut", "type": "uint256" }
    ],
    "name": "redeemWithTaiko",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ERC-20 Token ABI (for TAIKO token)
const ERC20_ABI = [
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
  },
  {
    "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Legacy Router ABI (for other chains)
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
  }
] as const;

type Token = {
  address: string
  symbol: string
  name: string
  routerAddress: string
  chainId: number
  networkName: string
  currency: string
  imageUrl?: string
  totalSupply?: number
  listedCount?: number
  floorPrice?: string
  marketCap?: string
  lastUpdated?: string
}

type TokenPrice = {
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

const TokenIcon = ({ symbol, currency, imageUrl, isNative = false }: {
  symbol: string,
  currency?: string,
  imageUrl?: string,
  isNative?: boolean
}) => {
  const getChainIcon = (symbol: string) => {
    switch (symbol) {
      case "ETH": return "https://res.cloudinary.com/deapg3k8f/image/upload/v1760381482/images-removebg-preview_fulbpm.png"
      case "APE": return "https://res.cloudinary.com/deapg3k8f/image/upload/v1760380693/apechain-removebg-preview_utmzqj.png"
      case "MON": return "https://res.cloudinary.com/deapg3k8f/image/upload/v1760381596/54777-removebg-preview_v7hcqr.png"
      case "TAIKO": return "https://res.cloudinary.com/deapg3k8f/image/upload/v1760381482/images-removebg-preview_fulbpm.png" // Using ETH icon for TAIKO for now
      default: return null
    }
  }

  const iconUrl = isNative ? getChainIcon(symbol) : imageUrl

  return (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center overflow-hidden">
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={symbol}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className="text-xs font-bold text-white">
          {symbol.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  )
}

export function SwapWidget({ defaultOut = "BOP", onPriceUpdate }: {
  defaultOut?: string
  onPriceUpdate?: (tokenAddress: string, tokensForOne: number) => void
}) {
  const { toast } = useToast()
  const { isDarkMode } = useTheme()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  // Debug chain detection
  useEffect(() => {
    console.log('🔗 Chain detection debug:')
    console.log('- Current chainId:', chainId)
    console.log('- Is connected:', isConnected)
    console.log('- Address:', address)

    if (chainId) {
      const chainConfig = Object.values(chainConfigs).find(c => c.id === chainId)
      console.log('- Chain config:', chainConfig)
      console.log('- Expected currency:', chainConfig?.currency)
    }
  }, [chainId, isConnected, address])

  const [tokens, setTokens] = useState<Token[]>([])
  const [nativeToken, setNativeToken] = useState<Token | null>(null)
  const [from, setFrom] = useState<Token | null>(null)
  const [to, setTo] = useState<Token | null>(null)
  const [amountIn, setAmountIn] = useState<string>("")
  const [slippagePct, setSlippagePct] = useState<number>(0.5)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  const [priceData, setPriceData] = useState<TokenPrice | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{
    hash: string
    amountIn: string
    amountOut: string
    fromCurrency: string
    toSymbol: string
  } | null>(null)
  const [nativeBalance, setNativeBalance] = useState<string>("0")
  const [ethBalance, setEthBalance] = useState<string>("0") // For gas fees on Taiko
  const [tokenBalance, setTokenBalance] = useState<string>("0")
  const [maxRedeemable, setMaxRedeemable] = useState<number>(0)

  // Fetch tokens from database
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/tokens?chainId=${chainId}`)
        const result = await response.json()

        if (result.success) {
          const fetchedTokens = result.data
          console.log(`Loaded ${fetchedTokens.length} tokens for chain ${chainId}:`, fetchedTokens.map((t: Token) => `${t.symbol} (${t.chainId})`))
          console.log('Token addresses:', fetchedTokens.map((t: Token) => `${t.symbol}: ${t.address}`))
          setTokens(fetchedTokens)

          // Create native token based on current chain
          const chainConfig = Object.values(chainConfigs).find(c => c.id === chainId)
          if (chainConfig) {
            const native = {
              address: '0x0000000000000000000000000000000000000000',
              symbol: chainConfig.currency,
              name: chainConfig.networkName,
              routerAddress: '',
              chainId: chainId,
              networkName: chainConfig.networkName,
              currency: chainConfig.currency,
            }
            console.log(`Created native token for chain ${chainId}:`, native)
            setNativeToken(native)
            setFrom(native) // Always set from as native token

            // Set default token (only token addresses, not native)
            const defaultToken = fetchedTokens
              .filter((t: Token) => t.address !== '0x0000000000000000000000000000000000000000')
              .find((t: Token) => t.symbol === defaultOut) ||
              fetchedTokens.find((t: Token) => t.address !== '0x0000000000000000000000000000000000000000')
            if (defaultToken) {
              console.log(`Set default token:`, defaultToken)
              setTo(defaultToken)
            }
          }
        } else {
          // If no tokens found for this chain, clear the state
          console.log(`No tokens found for chain ${chainId}`)
          setTokens([])
          setTo(null)
        }
      } catch (error) {
        console.error('Failed to fetch tokens:', error)
        toast({
          title: "Error",
          description: "Failed to load tokens",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (chainId) {
      fetchTokens()
    }
  }, [chainId, defaultOut, toast])

  // Fetch price data using client RPC when amount or token changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (!to || !from || !amountIn || Number.parseFloat(amountIn) <= 0 || !publicClient) {
        setPriceData(null)
        return
      }

      const isNativeToToken = from.address === '0x0000000000000000000000000000000000000000'
      const isTokenToNative = to.address === '0x0000000000000000000000000000000000000000'

      // Only allow native ↔ token swaps
      if (!isNativeToToken && !isTokenToNative) {
        setPriceData(null)
        return
      }

      try {
        setLoadingPrice(true)

        // Handle REDEEM (Token → Native)
        if (isTokenToNative) {
          console.log('Fetching REDEEM price for token:', from.address)

          const tokenAmountIn = parseEther(amountIn.toString())

          try {
            // First, check if the contract has sufficient liquidity
            let contractBalance: bigint
            const currencyName = chainId === 167000 ? 'TAIKO' : from.currency

            if (chainId === 167000) {
              // Taiko chain - check TAIKO token balance held by the contract
              const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"
              contractBalance = await publicClient.readContract({
                address: TAIKO_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [from.address as `0x${string}`]
              })
            } else {
              // Other chains - check native currency balance
              contractBalance = await publicClient.getBalance({
                address: from.address as `0x${string}`
              })
            }

            const totalSupply = await publicClient.readContract({
              address: from.address as `0x${string}`,
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
            }).catch(() => BigInt(0))

            console.log(`Contract balance: ${Number(contractBalance) / 1e18} ${currencyName}`)

            // If contract has no balance, redemption will fail
            if (contractBalance === BigInt(0)) {
              console.warn('Contract has no liquidity for redemption')
              setPriceData({
                tokenAddress: from.address,
                tokenSymbol: from.symbol,
                chainId: from.chainId,
                currency: from.currency,
                currentSupply: '0',
                curveK: 0,
                feeRate: 0,
                priceForTokens: '0',
                pricePerToken: '0',
                tokensForOne: '0',
                networkName: from.networkName
              })
              setLoadingPrice(false)
              return
            }

            // Get bonding curve parameters for validation
            const currentSupply = Number(totalSupply) / 1e18
            let curveK = 0.0001 // Default fallback

            try {
              const curve = await publicClient.readContract({
                address: from.address as `0x${string}`,
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
              })

              if (curve) {
                curveK = Number(curve.k) / 1e18
              }
            } catch (error) {
              console.warn('Could not fetch curve parameters:', error)
            }

            // Get user balance for validation
            let userBalance = 0
            try {
              const userBalanceWei = await publicClient.readContract({
                address: from.address as `0x${string}`,
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
              userBalance = Number(userBalanceWei) / 1e18
            } catch (error) {
              console.warn('Could not fetch user balance for validation:', error)
            }

            // Validate redemption amount with proper bonding curve math
            const validation = validateRedemptionAmount(Number.parseFloat(amountIn), contractBalance, totalSupply, currentSupply, curveK, userBalance)
            if (!validation.isValid) {
              console.warn('Invalid redemption amount:', validation.reason)
              setPriceData({
                tokenAddress: from.address,
                tokenSymbol: from.symbol,
                chainId: from.chainId,
                currency: from.currency,
                currentSupply: '0',
                curveK: 0,
                feeRate: 0,
                priceForTokens: '0',
                pricePerToken: '0',
                tokensForOne: '0',
                networkName: from.networkName
              })
              setLoadingPrice(false)
              return
            }

            // Preview how much native currency/TAIKO we'll get
            // Note: Use standard previewRedeem for all chains including Taiko
            const previewOut = await publicClient.readContract({
              address: from.address as `0x${string}`,
              abi: TOKEN_ABI,
              functionName: 'previewRedeem',
              args: [tokenAmountIn]
            })

            const nativeOut = Number(previewOut) / 1e18
            const chainConfig = Object.values(chainConfigs).find(c => c.id === from.chainId)
            const currencyDisplay = chainId === 167000 ? 'TAIKO' : (chainConfig?.currency || 'ETH')

            const priceData: TokenPrice = {
              tokenAddress: from.address,
              tokenSymbol: from.symbol,
              chainId: from.chainId,
              currency: currencyDisplay,
              currentSupply: '0',
              curveK: 0,
              feeRate: 0,
              priceForTokens: nativeOut.toFixed(8),
              pricePerToken: (nativeOut / Number.parseFloat(amountIn)).toFixed(8),
              tokensForOne: '0',
              networkName: chainConfig?.networkName || 'Unknown Network'
            }

            console.log('Redeem preview:', priceData)
            setPriceData(priceData)
            setLoadingPrice(false)
            return

          } catch (error: any) {
            console.error('Error fetching redeem preview:', error)

            // Handle specific underflow/overflow errors
            if (error.message?.includes('underflow') || error.message?.includes('overflow') ||
              error.message?.includes('Arithmetic operation resulted in underflow or overflow')) {
              console.warn('Redemption would result in underflow/overflow - insufficient liquidity')

              setPriceData({
                tokenAddress: from.address,
                tokenSymbol: from.symbol,
                chainId: from.chainId,
                currency: from.currency,
                currentSupply: '0',
                curveK: 0,
                feeRate: 0,
                priceForTokens: '0',
                pricePerToken: '0',
                tokensForOne: '0',
                networkName: from.networkName
              })
            } else {
              // For other errors, set a default price data
              setPriceData({
                tokenAddress: from.address,
                tokenSymbol: from.symbol,
                chainId: from.chainId,
                currency: from.currency,
                currentSupply: '0',
                curveK: 0,
                feeRate: 0,
                priceForTokens: '0',
                pricePerToken: '0',
                tokensForOne: '0',
                networkName: from.networkName
              })
            }

            setLoadingPrice(false)
            return
          }
        }

        // Handle MINT (Native → Token)
        console.log('Fetching MINT price for token:', to.address)

        // Validate contract address first
        if (!to.address || to.address === '0x0000000000000000000000000000000000000000') {
          console.error('Invalid contract address:', to.address)
          setLoadingPrice(false)
          return
        }

        // Get token contract data using client RPC with correct ABI
        const [totalSupply, symbol, curve] = await Promise.all([
          publicClient.readContract({
            address: to.address as `0x${string}`,
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
          }).catch((error) => {
            console.error('Failed to read totalSupply:', error)
            return BigInt(0)
          }),
          publicClient.readContract({
            address: to.address as `0x${string}`,
            abi: [
              {
                "inputs": [],
                "name": "symbol",
                "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: 'symbol'
          }).catch((error) => {
            console.error('Failed to read symbol:', error)
            return 'UNKNOWN'
          }),
          publicClient.readContract({
            address: to.address as `0x${string}`,
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
          }).catch((error) => {
            console.error('Failed to read curve:', error)
            return null
          })
        ])

        console.log('Token data from client RPC:', { totalSupply, symbol, curve })

        // Get chain config
        const chainConfig = Object.values(chainConfigs).find(c => c.id === to.chainId)

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
            tokenAddress: to.address,
            tokenSymbol: symbol,
            chainId: to.chainId,
            currency: chainConfig?.currency || 'ETH',
            currentSupply: currentSupply.toFixed(4),
            curveK: 0,
            feeRate: 0,
            priceForTokens: '0',
            pricePerToken: '0',
            tokensForOne: '0',
            networkName: chainConfig?.networkName || 'Unknown Network'
          }
          setPriceData(priceData)
          return
        }

        // Calculate price for the requested amount using quadratic bonding curve
        // User enters the amount of ETH/native currency they want to spend
        const ethAmount = Number.parseFloat(amountIn)

        // Calculate how many tokens they'll receive for that ETH amount
        const tokensForAmount = getTokensForETH(ethAmount, currentSupply, K, FEE_RATE)

        // Calculate the actual cost (should be approximately equal to ethAmount)
        const actualCost = getPriceForTokens(tokensForAmount, currentSupply, K, FEE_RATE)

        // Price per token is the cost divided by tokens received
        const pricePerToken = tokensForAmount > 0 ? actualCost / tokensForAmount : 0

        // Also calculate tokens for 1 unit (for display purposes)
        const tokensForOne = getTokensForETH(1, currentSupply, K, FEE_RATE)

        const priceData: TokenPrice = {
          tokenAddress: to.address,
          tokenSymbol: symbol,
          chainId: to.chainId,
          currency: chainConfig?.currency || 'ETH',
          currentSupply: currentSupply.toFixed(4),
          curveK: K,
          feeRate: FEE_RATE * 100, // Convert to percentage
          priceForTokens: actualCost.toFixed(8),
          pricePerToken: pricePerToken.toFixed(8),
          tokensForOne: tokensForOne.toFixed(4),
          networkName: chainConfig?.networkName || 'Unknown Network'
        }

        console.log('Calculated price data:', priceData)
        setPriceData(priceData)

        // Share price with parent component (for Live Auctions)
        if (onPriceUpdate && to) {
          onPriceUpdate(to.address, tokensForOne)
        }

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

    fetchPrice()
  }, [to, from, amountIn, publicClient, toast])

  // Fetch balances (client RPC)
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        if (!publicClient || !address) return

        if (chainId === 167000) {
          // Taiko chain - fetch both TAIKO token balance (for minting) and ETH balance (for gas)
          const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"
          const TAIKO_TOKEN_ABI = [
            {
              "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
              "name": "balanceOf",
              "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
              "stateMutability": "view",
              "type": "function"
            }
          ] as const

          // Fetch TAIKO token balance (for minting)
          const taikoBal = await publicClient.readContract({
            address: TAIKO_TOKEN_ADDRESS,
            abi: TAIKO_TOKEN_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`]
          })

          // Fetch native ETH balance (for gas fees)
          const ethBal = await publicClient.getBalance({ address })

          const taikoBalance = (Number(taikoBal) / 1e18).toFixed(6)
          const ethGasBalance = (Number(ethBal) / 1e18).toFixed(6)

          console.log('TAIKO balance (for minting):', taikoBalance)
          console.log('ETH balance (for gas):', ethGasBalance)

          setNativeBalance(taikoBalance) // TAIKO for minting
          setEthBalance(ethGasBalance)   // ETH for gas fees
        } else {
          // Other chains - get native currency balance
          const bal = await publicClient.getBalance({ address })
          const nativeBal = (Number(bal) / 1e18).toFixed(6)
          console.log('Native balance:', nativeBal)
          setNativeBalance(nativeBal)
          setEthBalance("0") // Not needed for other chains
        }

        // Token balance - only if we have a token address (not native)
        const tokenAddr = from?.address && from.address !== '0x0000000000000000000000000000000000000000'
          ? from.address
          : (to?.address && to.address !== '0x0000000000000000000000000000000000000000'
            ? to.address
            : null)

        if (tokenAddr) {
          try {
            const [balOf, totalSupply] = await Promise.all([
              publicClient.readContract({
                address: tokenAddr as `0x${string}`,
                abi: TOKEN_ABI,
                functionName: 'balanceOf',
                args: [address as `0x${string}`]
              }),
              publicClient.readContract({
                address: tokenAddr as `0x${string}`,
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
              }).catch(() => BigInt(0))
            ])

            const tokenBal = (Number(balOf) / 1e18).toFixed(6)
            const userBalance = Number(balOf) / 1e18
            const totalSupplyNum = Number(totalSupply) / 1e18

            console.log('Token balance:', tokenBal, 'for token:', tokenAddr)
            setTokenBalance(tokenBal)

            // Calculate max redeemable amount
            const maxRedemptionPercent = userBalance > totalSupplyNum * 0.8 ? 0.9 : 0.5
            const maxRedeemableAmount = Math.min(userBalance, totalSupplyNum * maxRedemptionPercent)
            setMaxRedeemable(maxRedeemableAmount)

            console.log(`Max redeemable: ${maxRedeemableAmount.toFixed(6)} (${(maxRedemptionPercent * 100).toFixed(0)}% of supply)`)
          } catch (e) {
            console.log('Error fetching token balance:', e)
            setTokenBalance("0")
            setMaxRedeemable(0)
          }
        } else {
          setTokenBalance("0")
          setMaxRedeemable(0)
        }
      } catch (e) {
        console.log('Error fetching balances:', e)
        setNativeBalance("0")
        setTokenBalance("0")
      }
    }

    fetchBalances()
  }, [publicClient, address, from, to])

  // Ensure from token is always native (with delay to allow smooth swaps)
  useEffect(() => {
    if (nativeToken && from?.address !== '0x0000000000000000000000000000000000000000') {
      // Allow a brief delay for swap animations to complete
      const timer = setTimeout(() => {
        const toIsNative = to?.address === '0x0000000000000000000000000000000000000000'
        if (!toIsNative) {
          console.log('Forcing from token to be native after delay:', nativeToken)
          setFrom(nativeToken)
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [nativeToken, from, to])

  const amountOut = useMemo(() => {
    if (!priceData) return "0.00"
    const isTokenToNative = to?.address === '0x0000000000000000000000000000000000000000'
    const nIn = Number.parseFloat(amountIn || "0")
    if (nIn <= 0) return "0.00"
    if (isTokenToNative) {
      // For redeem, priceData.priceForTokens is native out for amountIn tokens
      const nativeOut = Number.parseFloat(priceData.priceForTokens || "0")
      const slip = nativeOut * (1 - slippagePct / 100)
      return slip.toFixed(6)
    } else {
      // For mint, use proper bonding curve calculation (not linear approximation)
      // This matches the listing page implementation
      const currentSupply = Number.parseFloat(priceData.currentSupply || "0")
      const K = priceData.curveK || 0
      const feeRate = (priceData.feeRate || 0) / 100 // Convert percentage to decimal

      // Use getTokensForETH with the actual amount the user is spending
      const tokens = getTokensForETH(nIn, currentSupply, K, feeRate)
      const slip = tokens * (1 - slippagePct / 100)
      return slip.toFixed(6)
    }
  }, [priceData, amountIn, slippagePct, to])

  const onSwap = async () => {
    console.log('onSwap clicked!')
    console.log('isConnected:', isConnected)
    console.log('address:', address)
    console.log('to:', to)
    console.log('from:', from)
    console.log('priceData:', priceData)
    console.log('walletClient:', walletClient)
    console.log('publicClient:', publicClient)
    console.log('amountIn:', amountIn)
    console.log('amountOut:', amountOut)

    if (!isConnected || !address || !to || !from || !priceData || !walletClient || !publicClient) {
      console.log('Missing required data for swap')
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      })
      return
    }

    const isNativeToToken = from.address === '0x0000000000000000000000000000000000000000'
    const isTokenToNative = to.address === '0x0000000000000000000000000000000000000000'

    // Only allow native ↔ token swaps
    if (!isNativeToToken && !isTokenToNative) {
      toast({
        title: "Error",
        description: "Only native ↔ token swaps are supported",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      // REDEEM: Token → Native
      if (isTokenToNative) {
        console.log('Executing REDEEM transaction')

        const tokenAmountIn = parseEther(amountIn.toString())
        const slippageBps = Math.floor(slippagePct * 100) // Convert % to bps

        try {
          // First, check if the contract has sufficient liquidity and get bonding curve parameters
          let contractBalance: bigint

          if (chainId === 167000) {
            // Taiko chain - check TAIKO token balance held by the contract
            const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"
            contractBalance = await publicClient.readContract({
              address: TAIKO_TOKEN_ADDRESS,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [from.address as `0x${string}`]
            })
          } else {
            // Other chains - check native currency balance
            contractBalance = await publicClient.getBalance({
              address: from.address as `0x${string}`
            })
          }

          const [totalSupply, curve] = await Promise.all([
            publicClient.readContract({
              address: from.address as `0x${string}`,
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
              address: from.address as `0x${string}`,
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

          const currencyName = chainId === 167000 ? 'TAIKO' : to.currency

          if (contractBalance === BigInt(0)) {
            toast({
              title: "Redemption Failed",
              description: `Contract has no ${currencyName} liquidity available for redemption`,
              variant: "destructive"
            })
            setLoading(false)
            return
          }

          // Get bonding curve parameters
          const currentSupply = Number(totalSupply) / 1e18
          let curveK = 0.0001 // Default fallback

          if (curve) {
            curveK = Number(curve.k) / 1e18
          }

          console.log(`Redemption validation - Current supply: ${currentSupply}, Curve K: ${curveK}, Contract balance: ${Number(contractBalance) / 1e18} ${currencyName}`)

          // Check user's token balance
          const userBalance = await publicClient.readContract({
            address: from.address as `0x${string}`,
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
          console.log(`User balance: ${userBalanceNum} ${from.symbol}, trying to redeem: ${amountIn}`)

          if (userBalanceNum < Number.parseFloat(amountIn)) {
            toast({
              title: "Redemption Failed",
              description: `Insufficient token balance. You have ${userBalanceNum.toFixed(6)} ${from.symbol} but trying to redeem ${amountIn}`,
              variant: "destructive"
            })
            setLoading(false)
            return
          }

          // Validate redemption amount with proper bonding curve math
          const validation = validateRedemptionAmount(Number.parseFloat(amountIn), contractBalance, totalSupply, currentSupply, curveK, userBalanceNum)
          if (!validation.isValid) {
            toast({
              title: "Redemption Failed",
              description: validation.reason || "Invalid redemption amount",
              variant: "destructive"
            })
            setLoading(false)
            return
          }

          // Calculate minOut with slippage
          // Note: Use standard previewRedeem for all chains including Taiko
          const previewOut = await publicClient.readContract({
            address: from.address as `0x${string}`,
            abi: TOKEN_ABI,
            functionName: 'previewRedeem',
            args: [tokenAmountIn]
          })

          const minOut = (previewOut * BigInt(10000 - slippageBps)) / BigInt(10000)

          const toCurrencyDisplay = chainId === 167000 ? 'TAIKO' : to.currency

          console.log(`Redeeming ${amountIn} ${from.symbol}`)
          console.log(`Expected out: ${Number(previewOut) / 1e18} ${toCurrencyDisplay}`)
          console.log(`Min out (with ${slippagePct}% slippage): ${Number(minOut) / 1e18} ${toCurrencyDisplay}`)

          // Execute redeem - different logic for Taiko chain
          let hash: string

          if (chainId === 167000) {
            // Taiko chain - use redeemWithTaiko to get TAIKO tokens back
            console.log('🔗 Taiko redeem process started')
            console.log('  Token contract:', from.address)
            console.log('  Tokens to redeem:', (Number(tokenAmountIn) / 1e18).toFixed(6))
            console.log('  Expected TAIKO back:', (Number(previewOut) / 1e18).toFixed(6))
            console.log('  Min out (with slippage):', (Number(minOut) / 1e18).toFixed(6))

            console.log('Executing redeemWithTaiko transaction with params:', {
              amount: tokenAmountIn.toString(),
              from: address,
              to: address,
              minOut: minOut.toString(),
              gas: '500000'
            })

            hash = await walletClient.writeContract({
              address: from.address as `0x${string}`,
              abi: UPFLOOR_TOKEN_ABI,
              functionName: 'redeemWithTaiko',
              args: [tokenAmountIn, address as `0x${string}`, address as `0x${string}`, minOut],
              gas: BigInt(500000),
            })

            console.log('  ✅ Redeem transaction submitted:', hash)
          } else {
            // Other chains - use standard redeem for native currency
            console.log('Executing redeem transaction with params:', {
              tokenAmountIn: tokenAmountIn.toString(),
              from: address,
              to: address,
              minOut: minOut.toString(),
              gas: '500000'
            })

            hash = await walletClient.writeContract({
              address: from.address as `0x${string}`,
              abi: TOKEN_ABI,
              functionName: 'redeem',
              args: [tokenAmountIn, address as `0x${string}`, address as `0x${string}`, minOut],
              gas: BigInt(500000),
            })
          }

          setSuccessData({
            hash,
            amountIn: amountIn,
            amountOut: (Number(previewOut) / 1e18).toFixed(6),
            fromCurrency: from.symbol,
            toSymbol: toCurrencyDisplay
          })
          setShowSuccess(true)

          toast({
            title: "Transaction submitted",
            description: `Redeeming ${amountIn} ${from.symbol} for ${(Number(previewOut) / 1e18).toFixed(6)} ${toCurrencyDisplay}`,
          })

          console.log('Redeem transaction hash:', hash)
          setLoading(false)
          return

        } catch (error: any) {
          // Only log errors that aren't user cancellations
          if (shouldLogError(error)) {
            console.error('Error executing redeem transaction:', error)
          }

          // Get user-friendly error message
          const errorInfo = getTransactionErrorMessage(error)

          // For user cancellations, auto-dismiss after 2 seconds
          const duration = errorInfo.variant === 'default' ? 2000 : undefined

          toast({
            title: errorInfo.title,
            description: errorInfo.description,
            variant: errorInfo.variant,
            duration: duration
          })

          setLoading(false)
          return
        }
      }

      // MINT: Native → Token (existing code)

      // User wants to spend amountIn (e.g., 2 APE)
      const nativeAmount = parseEther(amountIn.toString())

      console.log(`User wants to spend: ${amountIn} ${from.currency}`)
      console.log(`Native amount in wei: ${nativeAmount.toString()}`)

      // Use binary search to find the correct token amount that matches the user's native currency input
      // This ensures the previewMint cost matches exactly what the user wants to spend
      let low = BigInt(0)
      let high = parseEther("1000000") // Max 1M tokens
      let bestTokenAmount = BigInt(0)
      let bestCost = BigInt(0)

      // Binary search to find token amount where previewMint cost ≈ user's native amount
      for (let i = 0; i < 50; i++) {
        const mid = (low + high) / BigInt(2)

        try {
          const cost = await publicClient.readContract({
            address: to.address as `0x${string}`,
            abi: TOKEN_ABI,
            functionName: 'previewMint',
            args: [mid]
          })

          const costNumber = Number(cost)
          const nativeAmountNumber = Number(nativeAmount)

          if (costNumber <= nativeAmountNumber) {
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

      console.log(`Found optimal token amount: ${bestTokenAmount.toString()} wei`)
      console.log(`Optimal cost: ${bestCost.toString()} wei`)
      console.log(`User wants to spend: ${nativeAmount.toString()} wei`)

      if (bestTokenAmount === BigInt(0)) {
        toast({
          title: "Insufficient Amount",
          description: "Amount too small to mint any tokens",
          variant: "destructive"
        })
        return
      }

      // Execute mint transaction - different logic for Taiko chain
      let hash: string

      if (chainId === 167000) {
        // Taiko chain - use TAIKO ERC-20 token for minting
        const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"

        console.log('🔗 Taiko minting process started')
        console.log('  Token contract:', to.address)
        console.log('  TAIKO token:', TAIKO_TOKEN_ADDRESS)
        console.log('  Tokens to mint:', (Number(bestTokenAmount) / 1e18).toFixed(6))
        console.log('  TAIKO cost:', (Number(bestCost) / 1e18).toFixed(6))

        // Check TAIKO token balance
        const taikoBalance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        })

        console.log('  Your TAIKO balance:', (Number(taikoBalance) / 1e18).toFixed(6))

        if (taikoBalance < bestCost) {
          toast({
            title: "Insufficient TAIKO",
            description: `Need ${(Number(bestCost) / 1e18).toFixed(6)} TAIKO but you have ${(Number(taikoBalance) / 1e18).toFixed(6)} TAIKO`,
            variant: "destructive"
          })
          setLoading(false)
          return
        }

        // Check allowance - approve to TOKEN contract (not router)
        const currentAllowance = await publicClient.readContract({
          address: TAIKO_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, to.address as `0x${string}`]
        })

        console.log('  Current allowance:', (Number(currentAllowance) / 1e18).toFixed(6), 'TAIKO')

        // Only approve TAIKO tokens to the TOKEN CONTRACT if current allowance is insufficient
        if (currentAllowance < bestCost) {
          console.log('  Approving TAIKO tokens to token contract...')
          toast({
            title: "Approving TAIKO",
            description: "Approving TAIKO token spending...",
          })

          try {
            // Approve a larger amount to avoid frequent approvals (approve 10x the needed amount)
            const approvalAmount = bestCost * BigInt(10) // Approve 10x the needed amount for future transactions
            console.log('  Approving amount:', (Number(approvalAmount) / 1e18).toFixed(6), 'TAIKO (10x needed amount)')

            const approveHash = await walletClient.writeContract({
              address: TAIKO_TOKEN_ADDRESS,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [to.address as `0x${string}`, approvalAmount],
              gas: BigInt(100000),
            })

            console.log('  Approval tx hash:', approveHash)
            console.log('  Waiting for approval confirmation...')

            // Wait for approval
            await publicClient.waitForTransactionReceipt({ hash: approveHash })

            console.log('  ✅ TAIKO tokens approved!')
            toast({
              title: "TAIKO Approved",
              description: "Approval successful! Proceeding with transaction...",
            })
          } catch (approveError: any) {
            // Only log errors that aren't user cancellations
            if (shouldLogError(approveError)) {
              console.error('  ❌ Approval failed:', approveError)
            }

            // Get user-friendly error message
            const errorInfo = getTransactionErrorMessage(approveError)

            // For user cancellations, auto-dismiss after 2 seconds
            const duration = errorInfo.variant === 'default' ? 2000 : undefined

            toast({
              title: errorInfo.title,
              description: errorInfo.description,
              variant: errorInfo.variant,
              duration: duration
            })
            setLoading(false)
            return
          }
        } else {
          console.log('  ✅ Already approved')
        }

        // Execute mintWithTaiko transaction directly on TOKEN contract
        console.log('  Calling mintWithTaiko on token contract...')
        hash = await walletClient.writeContract({
          address: to.address as `0x${string}`,  // Call TOKEN contract directly, not router
          abi: UPFLOOR_TOKEN_ABI,
          functionName: 'mintWithTaiko',
          args: [bestTokenAmount, address as `0x${string}`],
          gas: BigInt(1000000),
        })

        console.log('  ✅ Mint transaction submitted:', hash)

      } else {
        // Other chains - use native currency (ETH, MATIC, etc.)
        hash = await walletClient.writeContract({
          address: to.routerAddress as `0x${string}`,
          abi: ROUTER_ABI,
          functionName: 'mint',
          args: [bestTokenAmount, address as `0x${string}`],
          value: bestCost, // Use the exact cost from previewMint
          gas: BigInt(1000000),
        })
      }

      // Show success modal with actual amounts
      const actualTokenAmount = Number(bestTokenAmount) / 1e18
      const fromCurrencyDisplay = chainId === 167000 ? 'TAIKO' : from.currency

      setSuccessData({
        hash,
        amountIn: (Number(bestCost) / 1e18).toFixed(6), // Show actual cost spent
        amountOut: actualTokenAmount.toFixed(6), // Show actual tokens received
        fromCurrency: fromCurrencyDisplay,
        toSymbol: to.symbol
      })
      setShowSuccess(true)

      toast({
        title: "Transaction submitted",
        description: `Spending ${(Number(bestCost) / 1e18).toFixed(6)} ${fromCurrencyDisplay} to mint ${actualTokenAmount.toFixed(6)} ${to.symbol}`,
      })

      console.log('Transaction hash:', hash)

    } catch (error) {
      // Only log errors that aren't user cancellations
      if (shouldLogError(error)) {
        console.error('Swap error:', error)
      }

      // Get user-friendly error message
      const errorInfo = getTransactionErrorMessage(error)

      // For user cancellations, auto-dismiss after 2 seconds
      // For other errors, keep them until manually dismissed
      const duration = errorInfo.variant === 'default' ? 2000 : undefined

      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: errorInfo.variant,
        duration: duration
      })
    } finally {
      setLoading(false)
    }
  }

  const usdIn = useMemo(() => {
    const n = Number.parseFloat(amountIn || "0")
    return n.toFixed(4)
  }, [amountIn])

  const usdOut = useMemo(() => {
    const n = Number.parseFloat(amountOut || "0")
    return n.toFixed(4)
  }, [amountOut])

  const swapTokens = () => {
    if (!to || !from || !nativeToken) return

    // Only allow swapping if one is native and one is token address
    const fromIsNative = from.address === '0x0000000000000000000000000000000000000000'
    const toIsNative = to.address === '0x0000000000000000000000000000000000000000'

    if (fromIsNative && !toIsNative) {
      // Native → Token: swap to Token → Native
      setFrom(to) // Set token as from
      setTo(nativeToken) // Set native as to
      setAmountIn("") // Clear amount when swapping
    } else if (!fromIsNative && toIsNative) {
      // Token → Native: swap to Native → Token
      setFrom(nativeToken) // Set native as from
      setTo(from) // Set current from token as to
      setAmountIn("") // Clear amount when swapping
    } else {
      // Token → Token or Native → Native: not allowed
      toast({
        title: "Invalid Swap",
        description: "Only native ↔ token swaps are allowed",
        variant: "destructive"
      })
    }
  }

  return (
    <Card className={`border backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden max-w-sm mx-auto ${isDarkMode
      ? 'border-gray-700/60 bg-gray-800/70'
      : 'border-gray-200/60 bg-white/70'
      }`}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="mb-3">
          <div>
            <h2 className={`text-base font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Trading Hub</h2>
            <p className={`text-xs mt-0.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Native ↔ Token swaps only</p>
          </div>
        </div>
        {/* Balance + Quick Selects for From amount */}
        <div className="flex items-center justify-between mt-1 mb-3">
          <span className={`text-[11px] transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
            {from?.address === '0x0000000000000000000000000000000000000000' ? (
              <>
                Balance: {nativeBalance} {chainId === 167000 && from?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : from?.symbol}
                {chainId === 167000 && from?.address === '0x0000000000000000000000000000000000000000' && (
                  <div className="text-xs opacity-75">
                    Gas: {ethBalance} ETH
                  </div>
                )}
              </>
            ) : (
              <>
                Balance: {tokenBalance} {from?.symbol}
                {maxRedeemable > 0 && maxRedeemable < Number(tokenBalance) && (
                  <span className={`ml-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    (Max: {maxRedeemable.toFixed(2)})
                  </span>
                )}
              </>
            )}
          </span>
          <div className="flex gap-1">
            {[25, 50, 100].map((p) => (
              <Button
                key={`from-pct-${p}`}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (from?.address === '0x0000000000000000000000000000000000000000') {
                    const n = Number(nativeBalance || '0')
                    const val = p === 100 ? n : (n * (p / 100))
                    setAmountIn(val.toFixed(6))
                  } else {
                    // For tokens, use max redeemable amount if it's less than total balance
                    const maxAmount = maxRedeemable > 0 && maxRedeemable < Number(tokenBalance) ? maxRedeemable : Number(tokenBalance || '0')
                    const val = p === 100 ? maxAmount : (maxAmount * (p / 100))
                    setAmountIn(val.toFixed(6))
                  }
                }}
                className={`h-6 px-2 text-[11px] ${isDarkMode
                  ? 'border-gray-600/50 hover:bg-gray-700'
                  : 'border-gray-200/50 hover:bg-gray-100'
                  }`}
              >
                {p === 100 ? 'MAX' : `${p}%`}
              </Button>
            ))}
          </div>
        </div>


        {/* Settings Panel */}
        {showSettings && (
          <div className={`mb-3 p-3 rounded-lg border transition-colors duration-300 ${isDarkMode
            ? 'bg-gray-700/50 border-gray-600/40'
            : 'bg-gray-50/50 border-gray-200/40'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Slippage Tolerance</span>
              <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>{slippagePct}%</span>
            </div>
            <div className="flex gap-1">
              {[0.1, 0.5, 1.0].map((value) => (
                <Button
                  key={value}
                  variant={slippagePct === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlippagePct(value)}
                  className={`h-6 px-2 text-xs ${slippagePct === value
                    ? isDarkMode
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500"
                      : "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200"
                    : isDarkMode
                      ? "border-gray-600/50 hover:bg-gray-700"
                      : "border-gray-200/50 hover:bg-gray-100"
                    }`}
                >
                  {value}%
                </Button>
              ))}
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={slippagePct}
                onChange={(e) => setSlippagePct(Number.parseFloat(e.target.value || "0"))}
                className={`h-6 w-12 text-xs text-center transition-colors duration-300 ${isDarkMode
                  ? 'border-gray-600/50 bg-gray-700/50 text-white'
                  : 'border-gray-200/50'
                  }`}
                placeholder="Custom"
              />
              {/* Injected balance + quick selects */}
              <span className={`ml-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {(() => {
                  const isNative = from?.address === '0x0000000000000000000000000000000000000000'
                  if (isNative) {
                    return (
                      <>
                        Balance: {nativeBalance} {chainId === 167000 && from?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : from?.symbol}
                        {chainId === 167000 && from?.address === '0x0000000000000000000000000000000000000000' && (
                          <div className="text-xs opacity-75">
                            Gas: {ethBalance} ETH
                          </div>
                        )}
                      </>
                    )
                  } else {
                    return (
                      <>
                        Balance: {tokenBalance} {from?.symbol}
                        {maxRedeemable > 0 && maxRedeemable < Number(tokenBalance) && (
                          <span className={`ml-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            (Max: {maxRedeemable.toFixed(2)})
                          </span>
                        )}
                      </>
                    )
                  }
                })()}
              </span>
              {[25, 50, 100].map((p) => (
                <Button
                  key={`pct-${p}`}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (from?.address === '0x0000000000000000000000000000000000000000') {
                      const n = Number(nativeBalance || '0')
                      const val = p === 100 ? n : (n * (p / 100))
                      console.log('Quick select clicked:', p, 'balance:', nativeBalance, 'calculated value:', val)
                      setAmountIn(val.toFixed(6))
                    } else {
                      // For tokens, use max redeemable amount if it's less than total balance
                      const maxAmount = maxRedeemable > 0 && maxRedeemable < Number(tokenBalance) ? maxRedeemable : Number(tokenBalance || '0')
                      const val = p === 100 ? maxAmount : (maxAmount * (p / 100))
                      console.log('Quick select clicked:', p, 'maxAmount:', maxAmount, 'calculated value:', val)
                      setAmountIn(val.toFixed(6))
                    }
                  }}
                  className={`h-6 px-2 text-xs ${isDarkMode
                    ? 'border-gray-600/50 hover:bg-gray-700'
                    : 'border-gray-200/50 hover:bg-gray-100'
                    }`}
                >
                  {p === 100 ? 'MAX' : `${p}%`}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* From Token */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>You pay</span>
            <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>≈ {usdIn} {chainId === 167000 && from?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : from?.currency}</span>
          </div>
          <div className={`flex items-center gap-2 p-3 rounded-lg border transition-colors duration-300 ${isDarkMode
            ? 'bg-gray-700/50 border-gray-600/40'
            : 'bg-white/50 border-gray-200/40'
            }`}>
            <div className="flex items-center gap-2">
              {from && <TokenIcon symbol={chainId === 167000 && from.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : from.symbol} currency={from.currency} isNative={from.address === '0x0000000000000000000000000000000000000000'} imageUrl={from.imageUrl} />}
              <div className={`text-xs font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                {chainId === 167000 && from?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO - TAIKO Token' : `${from?.symbol} - ${from?.name}`}
              </div>
              <span className={`text-[10px] px-2 py-1 rounded transition-colors duration-300 ${isDarkMode ? 'bg-green-600 text-green-100' : 'bg-green-100 text-green-700'
                }`}>
                NATIVE
              </span>
            </div>
            <Input
              type="number"
              min="0"
              step="0.0001"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className={`flex-1 border-0 bg-transparent text-right text-sm font-semibold focus:ring-0 p-0 transition-colors duration-300 ${isDarkMode
                ? 'text-white placeholder:text-gray-500'
                : 'text-gray-800 placeholder:text-gray-400'
                }`}
              disabled={loading}
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-1 relative z-10">
          <Button
            onClick={swapTokens}
            disabled={loading}
            className={`h-8 w-8 rounded-full border shadow-sm transition-all duration-200 hover:scale-110 ${isDarkMode
              ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
          >
            <ArrowUpDown className={`h-3 w-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`} />
          </Button>
        </div>

        {/* To Token */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>You'll receive</span>
            <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>≈ {usdOut} {chainId === 167000 && to?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : to?.symbol}</span>
          </div>
          <div className={`flex items-center gap-2 p-3 rounded-lg border transition-colors duration-300 ${isDarkMode
            ? 'bg-gray-700/50 border-gray-600/40'
            : 'bg-white/50 border-gray-200/40'
            }`}>
            <div className="flex items-center gap-2">
              {to && <TokenIcon symbol={chainId === 167000 && to.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : to.symbol} currency={to.currency} imageUrl={to.imageUrl} isNative={to.address === '0x0000000000000000000000000000000000000000'} />}
              {to?.address === '0x0000000000000000000000000000000000000000' ? (
                // Show native token (no dropdown)
                <div className={`text-xs font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                  {chainId === 167000 && to.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO - TAIKO Token' : `${to.symbol} - ${to.name}`}
                </div>
              ) : (
                // Show token dropdown
                <select
                  value={to?.symbol || ''}
                  onChange={(e) => {
                    const selectedToken = tokens.find((t) => t.symbol === e.target.value)
                    if (selectedToken) {
                      // Prevent native-to-native swaps (from is always native)
                      if (selectedToken.address === '0x0000000000000000000000000000000000000000') {
                        toast({
                          title: "Invalid Selection",
                          description: "Cannot select native token as 'to' token. Only token addresses are allowed.",
                          variant: "destructive"
                        })
                        return
                      }
                      setTo(selectedToken)
                    }
                  }}
                  className={`bg-transparent border-0 text-xs font-medium focus:outline-none cursor-pointer transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}
                  disabled={loading}
                >
                  {tokens.length === 0 ? (
                    <option value="">No tokens available on this chain</option>
                  ) : (
                    tokens
                      .filter((t) => {
                        const isNotNative = t.address !== '0x0000000000000000000000000000000000000000'
                        console.log(`Token ${t.symbol}: address=${t.address}, isNotNative=${isNotNative}`)
                        return isNotNative
                      }) // Only show token addresses
                      .map((t) => (
                        <option key={t.symbol} value={t.symbol}>
                          {t.symbol} - {t.name}
                        </option>
                      ))
                  )}
                </select>
              )}
              {to?.address !== '0x0000000000000000000000000000000000000000' && (
                <ChevronDown className={`h-3 w-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
              )}
            </div>
            <Input
              readOnly
              value={loadingPrice ? "..." : amountOut}
              className={`flex-1 border-0 bg-transparent text-right text-sm font-semibold focus:ring-0 p-0 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}
            />
          </div>
        </div>

        {/* Swap Details */}
        {amountIn && Number.parseFloat(amountIn) > 0 && priceData && (
          <div className={`mb-4 p-3 rounded-lg border space-y-1 transition-colors duration-300 ${isDarkMode
            ? 'bg-gray-700/50 border-gray-600/40'
            : 'bg-gray-50/50 border-gray-200/40'
            }`}>
            <div className="flex justify-between text-xs">
              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Rate</span>
              <span className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                1 {chainId === 167000 && from?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : from?.currency} = {priceData.tokensForOne} {chainId === 167000 && to?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : to?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Minimum received</span>
              <span className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                {amountOut} {chainId === 167000 && to?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : to?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Price per token</span>
              <span className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                {priceData.pricePerToken} {chainId === 167000 && from?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : from?.currency}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Total cost</span>
              <span className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                {priceData.priceForTokens} {chainId === 167000 && from?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : from?.currency}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Current supply</span>
              <span className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                {priceData.currentSupply} {chainId === 167000 && to?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : to?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Fee rate</span>
              <span className="text-emerald-600 font-medium">{priceData.feeRate}%</span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <Button
          onClick={() => {
            console.log('Button clicked!')
            onSwap()
          }}
          disabled={!amountIn || Number.parseFloat(amountIn) <= 0 || !isConnected || loading || !priceData}
          className={`w-full h-10 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isDarkMode
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border border-purple-500 hover:border-purple-400'
            : 'bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 hover:text-purple-800 border border-purple-200 hover:border-purple-300'
            }`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : !amountIn || Number.parseFloat(amountIn) <= 0 ? (
            "Enter an amount"
          ) : !priceData ? (
            "Loading price..."
          ) : to?.address === '0x0000000000000000000000000000000000000000' ? (
            `Redeem to ${chainId === 167000 && to?.address === '0x0000000000000000000000000000000000000000' ? 'TAIKO' : to?.currency}`
          ) : (
            `Mint ${to?.symbol} tokens`
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center mt-3">
          Quote is indicative. Final amount depends on execution.
        </p>
      </CardContent>

      {/* Beautiful Success Modal */}
      {showSuccess && successData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`relative max-w-md w-full rounded-3xl overflow-hidden shadow-2xl ${isDarkMode
            ? 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border border-gray-600/50'
            : 'bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 border border-purple-200/50'
            }`}>
            {/* Animated Background */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 animate-pulse"></div>
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-full blur-xl animate-bounce"></div>
              <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-r from-pink-400/20 to-purple-400/20 rounded-full blur-lg animate-bounce" style={{ animationDelay: '0.5s' }}></div>
            </div>

            {/* Content */}
            <div className="relative z-10 p-8 text-center">
              {/* Celebration Animation */}
              <div className="mb-6">
                <div className="relative inline-block">
                  <div className="text-6xl animate-bounce">🎉</div>
                  <div className="absolute -top-2 -right-2 text-3xl animate-ping">✨</div>
                  <div className="absolute -bottom-2 -left-2 text-3xl animate-ping" style={{ animationDelay: '0.3s' }}>⭐</div>
                  <div className="absolute top-1/2 -left-4 text-2xl animate-pulse" style={{ animationDelay: '0.6s' }}>🌟</div>
                  <div className="absolute top-1/2 -right-4 text-2xl animate-pulse" style={{ animationDelay: '0.9s' }}>💫</div>
                </div>
              </div>

              {/* Success Title */}
              <h2 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                Swap Successful! 🚀
              </h2>

              {/* Success Message */}
              <p className={`text-sm mb-6 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                Your transaction has been completed successfully!
              </p>

              {/* Transaction Details */}
              <div className={`rounded-2xl p-4 mb-6 transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-700/50 border border-gray-600/40'
                : 'bg-white/50 border border-purple-200/40'
                }`}>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                      {successData.amountIn} {successData.fromCurrency}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className={`text-lg font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                      {successData.amountOut} {successData.toSymbol}
                    </span>
                  </div>
                </div>

                <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  Transaction Hash:
                  <a
                    href={getExplorerUrl(chainId, 'tx', successData.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-500 hover:text-blue-400 underline"
                  >
                    {successData.hash.slice(0, 10)}...{successData.hash.slice(-8)}
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowSuccess(false)}
                  className={`flex-1 h-11 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${isDarkMode
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border border-purple-500 hover:border-purple-400'
                    : 'bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 hover:text-purple-800 border border-purple-200 hover:border-purple-300'
                    }`}
                >
                  🎊 Continue Trading
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(successData.hash)
                    toast({
                      title: "Copied!",
                      description: "Transaction hash copied to clipboard",
                    })
                  }}
                  className={`h-11 px-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${isDarkMode
                    ? 'border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-800'
                    }`}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

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

// Bonding curve price calculation functions (matching server implementation)
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
