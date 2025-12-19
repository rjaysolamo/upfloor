"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TrendingToken {
  id: number
  name: string
  symbol: string
  icon: string
  price: string
  change1h: number
  change4h: number
  change12h: number
  change24h: number
  volume24h: string
  marketCap: string
  fdv: string
  liquidity: string
  holdings: number
  progress: number
  burned: string
  burnedAmount: string
  address: string
  routerAddress: string
  chainId: number
  networkName: string
  currency: string
  totalSupply: number
  listedCount: number
  lastUpdated: string
  createdAt: string
  // Real blockchain data
  currentSupply: number
  pricePerToken: number
  nativeCurrencyPrice: number
  contractBalance: number
  curveK: number
  feeRate: number
}

export default function DisplayTrendingToken() {
  const [timeFilter, setTimeFilter] = useState("24h")
  const [sortBy, setSortBy] = useState("progress")
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrendingTokens = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/trending-tokens?limit=20')
      const data = await response.json()
      
      if (data.success) {
        setTrendingTokens(data.data)
      } else {
        setError('Failed to fetch trending tokens')
      }
    } catch (err) {
      console.error('Error fetching trending tokens:', err)
      setError('Failed to fetch trending tokens')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrendingTokens()
  }, [])

  const timeFilters = [
    { label: "1h", value: "1h" },
    { label: "4h", value: "4h" },
    { label: "12h", value: "12h" },
    { label: "24h", value: "24h" },
  ]

  const sortOptions = [
    { label: "Progress", value: "progress" },
    { label: "Market Cap", value: "marketCap" },
    { label: "Price", value: "price" },
    { label: "Volume", value: "volume" },
  ]

  const getChangeValue = (token: TrendingToken) => {
    switch (timeFilter) {
      case "1h": return token.change1h
      case "4h": return token.change4h
      case "12h": return token.change12h
      case "24h": return token.change24h
      default: return token.change24h
    }
  }

  const sortedTokens = [...trendingTokens].sort((a, b) => {
    switch (sortBy) {
      case "progress":
        return b.progress - a.progress
      case "volume":
        return parseFloat(b.volume24h.replace(/[$,K,M]/g, '')) - parseFloat(a.volume24h.replace(/[$,K,M]/g, ''))
      case "marketCap":
        return parseFloat(b.marketCap.replace(/[$,M]/g, '')) - parseFloat(a.marketCap.replace(/[$,M]/g, ''))
      case "price":
        return parseFloat(b.price.replace('$', '')) - parseFloat(a.price.replace('$', ''))
      default:
        return 0
    }
  })

  return (
    <section aria-label="Trending strategy tokens" className="w-full border-y border-border/60 bg-background/60">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="py-4 sm:py-6">
          {/* Header with Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Trending Strategy Tokens</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTrendingTokens}
                disabled={loading}
                className="h-7 sm:h-8 px-2 sm:px-3"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Time Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm">
                    {timeFilter}
                    <ChevronDown className="ml-1 sm:ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {timeFilters.map((filter) => (
                    <DropdownMenuItem
                      key={filter.value}
                      onClick={() => setTimeFilter(filter.value)}
                      className={timeFilter === filter.value ? "bg-accent" : ""}
                    >
                      {filter.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm">
                    Sort by {sortOptions.find(opt => opt.value === sortBy)?.label}
                    <ChevronDown className="ml-1 sm:ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={sortBy === option.value ? "bg-accent" : ""}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Desktop Header Row - Hidden on mobile */}
          <div className="hidden lg:block rounded-lg border border-border/60 bg-background/20 p-4 mb-2">
            <div className="grid grid-cols-4 gap-4 items-center">
              {/* Strategy */}
              <div className="col-span-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Strategy</div>
              </div>
              
              {/* Progress */}
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Progress</div>
              </div>
              
              {/* Token Price */}
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Token Price</div>
              </div>
              
              {/* Market Cap */}
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Market Cap</div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Loading trending tokens...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-red-500 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchTrendingTokens}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Token Cards */}
          {!loading && !error && (
            <div className="space-y-3">
              {sortedTokens.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No trending tokens found</p>
                </div>
              ) : (
                sortedTokens.map((token, i) => {
              const changeValue = getChangeValue(token)
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4 hover:bg-background/60 transition-colors"
                >
                  {/* Mobile Layout */}
                  <div className="lg:hidden">
                    {/* Header with Strategy Info */}
                    <div className="flex items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-border/50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={token.icon}
                            alt={`${token.name} icon`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">{token.name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">{token.symbol}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats Grid - Only 3 columns */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Progress</div>
                        <div className={`font-medium text-sm ${token.progress === 100 ? 'text-green-500' : 'text-foreground'}`}>
                          {token.progress.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Token Price</div>
                        <div className="font-medium text-foreground text-sm">{token.price}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Market Cap</div>
                        <div className="font-medium text-foreground text-sm">{token.marketCap}</div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout - Only 4 columns */}
                  <div className="hidden lg:grid grid-cols-4 gap-4 items-center">
                    {/* Strategy */}
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={token.icon}
                          alt={`${token.name} icon`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{token.name}</h3>
                        <p className="text-sm text-muted-foreground">{token.symbol}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="text-center">
                      <div className={`font-medium ${token.progress === 100 ? 'text-green-500' : 'text-foreground'}`}>
                        {token.progress.toFixed(1)}%
                      </div>
                    </div>

                    {/* Token Price */}
                    <div className="text-center">
                      <div className="font-medium text-foreground">{token.price}</div>
                    </div>

                    {/* Market Cap */}
                    <div className="text-center">
                      <div className="font-medium text-foreground">{token.marketCap}</div>
                    </div>
                  </div>
                </div>
                )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
