"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { usePublicClient, useAccount } from "wagmi"
import { createPublicClient, http } from "viem"
import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  ExternalLink,
  Twitter,
  Globe,
  MessageCircle,
  Send,
  ArrowLeft,
  Copy,
  Check,
  Wallet
} from "lucide-react"
import { toast, Toaster } from "sonner"
import { chainConfigs } from "@/lib/chainlist"

interface ProjectData {
  id: number
  collection_name: string
  collection_owner: string
  chain_id: number
  token_address: string
  router_address: string
  strategy_address: string
  royalties_address: string
  deployer_address: string
  transaction_hash: string
  block_number: number
  token_symbol: string
  royalty_percentage: number
  collection_image: string | null
  website: string | null
  twitter: string | null
  discord: string | null
  telegram_id: string | null
  opensea_slug: string | null
  total_supply: number | null
  listed_count: number | null
  floor_price: string | null
  market_cap: string | null
  opensea_data_updated_at: string | null
  created_at: string
  updated_at: string
  network_name: string
  explorer_base_url: string
}

const TAIKO_TOKEN_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
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
  }
] as const;

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [poolBalance, setPoolBalance] = useState<number>(0)
  const [tokenSupply, setTokenSupply] = useState<number>(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const [copied, setCopied] = useState(false)

  const publicClient = usePublicClient()
  const { address, chain: connectedChain } = useAccount()

  const token_symbol = typeof params.token_symbol === 'string'
    ? params.token_symbol.toUpperCase()
    : ''

  useEffect(() => {
    setMounted(true)
    if (token_symbol) {
      fetchProject()
    }
  }, [token_symbol])

  useEffect(() => {
    if (project && publicClient) {
      fetchOnChainStats()
    }
  }, [project, publicClient])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/project/${token_symbol}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Project not found')
        } else {
          throw new Error('Failed to fetch project')
        }
        return
      }

      const data = await response.json()
      setProject(data.project)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchOnChainStats = async () => {
    if (!project || !publicClient) return

    try {
      setLoadingStats(true)

      // Fetch pool balance
      try {
        let balance: bigint
        if (project.chain_id === 167000) {
          // Taiko chain - use TAIKO token balance
          const taikoClient = createPublicClient({
            transport: http('https://rpc.taiko.xyz')
          })
          const TAIKO_TOKEN_ADDRESS = "0xA9d23408b9bA935c230493c40C73824Df71A0975"

          balance = await taikoClient.readContract({
            address: TAIKO_TOKEN_ADDRESS,
            abi: TAIKO_TOKEN_ABI,
            functionName: 'balanceOf',
            args: [project.token_address as `0x${string}`]
          })
        } else {
          // Other chains - use native currency balance
          balance = await publicClient.getBalance({
            address: project.token_address as `0x${string}`
          })
        }

        setPoolBalance(Number(balance) / 1e18)
      } catch (balanceErr) {
        console.error('Error fetching pool balance:', balanceErr)
        setPoolBalance(0)
      }

      // Fetch token supply
      try {
        const supply = await publicClient.readContract({
          address: project.token_address as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'totalSupply'
        })

        setTokenSupply(Number(supply) / 1e18)
      } catch (supplyErr) {
        console.error('Error fetching token supply:', supplyErr)
        setTokenSupply(0)
      }

    } catch (err) {
      console.error('Error fetching on-chain stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  const getChainCurrency = (chainId: number) => {
    if (chainId === 167000) return 'TAIKO'
    const chain = chainConfigs[chainId as keyof typeof chainConfigs]
    return chain ? chain.currency : 'ETH'
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Address copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const calculateProgress = () => {
    if (!project?.floor_price) return 0
    const target = parseFloat(project.floor_price)
    if (target === 0) return 0
    return Math.min((poolBalance / target) * 100, 100)
  }

  if (!mounted) return null

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
        : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
      }`}>
        <BidBopHeader />
        <div className="flex flex-col items-center justify-center py-32">
          <div className="relative mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 animate-pulse shadow-lg"></div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 animate-spin opacity-20" style={{ animationDuration: '3s' }}></div>
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading project details...
          </p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
        : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
      }`}>
        <BidBopHeader />
        <div className="flex flex-col items-center justify-center py-32">
          <div className={`text-6xl mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>404</div>
          <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Project Not Found
          </h1>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error || `No project found with symbol ${token_symbol}`}
          </p>
          <Button onClick={() => router.push('/browse')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Browse
          </Button>
        </div>
      </div>
    )
  }

  const progress = calculateProgress()

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
    }`}>
      <BidBopHeader />

      <main className="container mx-auto px-4 sm:px-6 py-6">
        {/* Back Button */}
        <Button
          onClick={() => router.push('/browse')}
          variant="ghost"
          size="sm"
          className={`mb-4 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Browse
        </Button>

        {/* Network Warning Banner */}
        {!address && (
          <div className={`mb-4 p-4 rounded-lg border ${isDarkMode
            ? 'bg-blue-900/20 border-blue-700/50 text-blue-300'
            : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">💼</div>
              <div className="flex-1">
                <div className="font-medium mb-1">Wallet Not Connected</div>
                <div className="text-sm opacity-90">
                  Connect your wallet to view on-chain data for this project.
                </div>
              </div>
            </div>
          </div>
        )}
        {connectedChain && connectedChain.id !== project.chain_id && (
          <div className={`mb-4 p-4 rounded-lg border ${isDarkMode
            ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300'
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <div className="font-medium mb-1">Wrong Network</div>
                <div className="text-sm opacity-90">
                  This project is on <strong>{project.network_name}</strong>. Please switch your wallet network to view on-chain data and trade.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className={`rounded-2xl overflow-hidden mb-6 ${isDarkMode
          ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700'
          : 'bg-gradient-to-br from-white/80 to-purple-50/50 border border-gray-200'
        }`}>
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Project Avatar */}
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl ${isDarkMode
                ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-2 border-purple-500'
                : 'bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-200'
              }`}>
                {project.collection_image ? (
                  <img
                    src={project.collection_image}
                    alt={project.collection_name}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  '🎨'
                )}
              </div>

              {/* Project Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {project.collection_name}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={`text-sm px-3 py-1 ${isDarkMode
                        ? "bg-purple-900/50 text-purple-300 border border-purple-700"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                      }`}>
                        ${project.token_symbol}
                      </Badge>
                      <Badge className={`text-sm px-3 py-1 ${isDarkMode
                        ? "bg-blue-900/50 text-blue-300 border border-blue-700"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}>
                        {project.network_name}
                      </Badge>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="flex gap-2">
                    {project.website && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => window.open(project.website!, '_blank')}
                        className={isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : ''}
                      >
                        <Globe className="h-4 w-4" />
                      </Button>
                    )}
                    {project.twitter && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => window.open(`https://twitter.com/${project.twitter}`, '_blank')}
                        className={isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : ''}
                      >
                        <Twitter className="h-4 w-4" />
                      </Button>
                    )}
                    {project.discord && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => window.open(project.discord!, '_blank')}
                        className={isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : ''}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {project.telegram_id && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => window.open(`https://t.me/${project.telegram_id}`, '_blank')}
                        className={isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : ''}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Contract Address */}
                <div className={`mt-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="text-sm font-mono">
                    {project.token_address}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(project.token_address)}
                    className="h-6 w-6"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => window.open(`${project.explorer_base_url}/address/${project.token_address}`, '_blank')}
                    className="h-6 w-6"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className={`${isDarkMode
            ? 'bg-gray-800/70 border-gray-700'
            : 'bg-white/70 border-gray-200'
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <DollarSign className="h-4 w-4" />
                Market Cap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {project.market_cap
                  ? `${parseFloat(project.market_cap).toFixed(4)} ${getChainCurrency(project.chain_id)}`
                  : 'N/A'
                }
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode
            ? 'bg-gray-800/70 border-gray-700'
            : 'bg-white/70 border-gray-200'
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <TrendingUp className="h-4 w-4" />
                Floor Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {project.floor_price
                  ? `${parseFloat(project.floor_price).toFixed(4)} ${getChainCurrency(project.chain_id)}`
                  : 'N/A'
                }
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode
            ? 'bg-gray-800/70 border-gray-700'
            : 'bg-white/70 border-gray-200'
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <ShoppingCart className="h-4 w-4" />
                Listed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {project.listed_count ?? 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDarkMode
            ? 'bg-gray-800/70 border-gray-700'
            : 'bg-white/70 border-gray-200'
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Wallet className="h-4 w-4" />
                Pool Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {loadingStats ? (
                  <span className="text-sm">Loading...</span>
                ) : !address ? (
                  <span className="text-sm text-gray-500">Connect wallet</span>
                ) : connectedChain && connectedChain.id !== project.chain_id ? (
                  <span className="text-sm text-yellow-500">Wrong network</span>
                ) : (
                  `${poolBalance.toFixed(4)} ${getChainCurrency(project.chain_id)}`
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Section */}
        <Card className={`mb-6 ${isDarkMode
          ? 'bg-gray-800/70 border-gray-700'
          : 'bg-white/70 border-gray-200'
        }`}>
          <CardHeader>
            <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              Strategy Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Pool Balance
                  </span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {progress.toFixed(1)}%
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between mt-2 text-xs">
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                    {poolBalance.toFixed(4)} {getChainCurrency(project.chain_id)}
                  </span>
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                    Target: {project.floor_price ? parseFloat(project.floor_price).toFixed(4) : 'N/A'} {getChainCurrency(project.chain_id)}
                  </span>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Token Supply
                </h4>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {loadingStats ? (
                    'Loading...'
                  ) : !address ? (
                    <span className="text-sm text-gray-500">Connect wallet</span>
                  ) : connectedChain && connectedChain.id !== project.chain_id ? (
                    <span className="text-sm text-yellow-500">Switch to {project.network_name}</span>
                  ) : tokenSupply === 0 ? (
                    <span className="text-sm text-gray-500">Not available</span>
                  ) : (
                    `${tokenSupply.toFixed(2)} ${project.token_symbol}`
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Trade Section */}
          <div className="lg:col-span-2">
            <Card className={`${isDarkMode
              ? 'bg-gray-800/70 border-gray-700'
              : 'bg-white/70 border-gray-200'
            }`}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  Trade ${project.token_symbol}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`p-6 rounded-lg text-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <ShoppingCart className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Trade this token on the trading hub or browse page
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => router.push('/tradinghub')}
                        className={isDarkMode
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                        }
                      >
                        Trading Hub
                      </Button>
                      <Button
                        onClick={() => router.push('/browse')}
                        variant="outline"
                      >
                        Browse Collections
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Section */}
          <div>
            <Card className={`${isDarkMode
              ? 'bg-gray-800/70 border-gray-700'
              : 'bg-white/70 border-gray-200'
            }`}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chain
                  </div>
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {project.network_name}
                  </div>
                </div>

                <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

                <div>
                  <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Total Supply
                  </div>
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {project.total_supply ?? 'N/A'}
                  </div>
                </div>

                <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

                <div>
                  <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Royalty
                  </div>
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {project.royalty_percentage}%
                  </div>
                </div>

                <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

                <div>
                  <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Deployed
                  </div>
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>

                {project.opensea_slug && (
                  <>
                    <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const url = project.chain_id === 167000
                          ? `https://okidori.io/collection/${project.opensea_slug}`
                          : `https://opensea.io/collection/${project.opensea_slug}`
                        window.open(url, '_blank')
                      }}
                    >
                      View on {project.chain_id === 167000 ? 'Okidori' : 'OpenSea'}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </main>

      <BidBopFooter />
      <Toaster position="top-right" richColors />
    </div>
  )
}
