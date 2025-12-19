"use client"

import { useState, useEffect } from "react"

interface StatsData {
  totalMarketCap: string
  totalCollections: number
  bestPerformer: string
}

export default function HorizontalStatsBar() {
  const [stats, setStats] = useState<StatsData>({
    totalMarketCap: "$0",
    totalCollections: 0,
    bestPerformer: "Loading..."
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Fetch trending tokens data to calculate stats
      const response = await fetch('/api/trending-tokens?limit=100')
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        const tokens = data.data

        // Calculate total market cap
        const totalMarketCapUSD = tokens.reduce((sum: number, token: any) => {
          const marketCap = parseFloat(token.marketCap.replace(/[$,K,M]/g, ''))
          const multiplier = token.marketCap.includes('M') ? 1000000 : token.marketCap.includes('K') ? 1000 : 1
          return sum + (marketCap * multiplier)
        }, 0)

        const totalMarketCapFormatted = totalMarketCapUSD > 1000000
          ? `$${(totalMarketCapUSD / 1000000).toFixed(2)}M`
          : totalMarketCapUSD > 1000
            ? `$${(totalMarketCapUSD / 1000).toFixed(2)}K`
            : `$${totalMarketCapUSD.toFixed(2)}`

        // Count total collections
        const totalCollections = tokens.length

        // Find best performer (highest market cap)
        const bestPerformer = tokens.reduce((best: any, token: any) => {
          const bestMarketCap = parseFloat(best.marketCap.replace(/[$,K,M]/g, ''))
          const bestMultiplier = best.marketCap.includes('M') ? 1000000 : best.marketCap.includes('K') ? 1000 : 1
          const bestValue = bestMarketCap * bestMultiplier

          const tokenMarketCap = parseFloat(token.marketCap.replace(/[$,K,M]/g, ''))
          const tokenMultiplier = token.marketCap.includes('M') ? 1000000 : token.marketCap.includes('K') ? 1000 : 1
          const tokenValue = tokenMarketCap * tokenMultiplier

          return tokenValue > bestValue ? token : best
        }, tokens[0])

        const bestPerformerFormatted = `${bestPerformer.symbol} ${bestPerformer.change24h >= 0 ? '+' : ''}${bestPerformer.change24h.toFixed(2)}%`

        setStats({
          totalMarketCap: totalMarketCapFormatted,
          totalCollections: totalCollections,
          bestPerformer: bestPerformerFormatted
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats({
        totalMarketCap: "Error",
        totalCollections: 0,
        bestPerformer: "Error"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const statsArray = [
    { label: "Total Market Cap", value: stats.totalMarketCap },
    { label: "Total Collections", value: stats.totalCollections.toString() },
    { label: "Best Performer", value: stats.bestPerformer },
  ]

  return (
    <section aria-label="Marketplace key stats" className="w-full border-y border-border/60 bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-stretch gap-4 overflow-x-auto py-4 [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* hide scrollbar in webkit */}
          <style
            dangerouslySetInnerHTML={{
              __html: ".hide-scrollbar::-webkit-scrollbar{display:none}",
            }}
          />
          {statsArray.map((stat, i) => (
            <div
              key={i}
              className="flex-1 min-w-[200px] rounded-md border border-border/60 bg-background/40 px-4 py-4"
            >
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{stat.label}</div>
              <div className="mt-1 text-base font-medium text-foreground">
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse bg-muted-foreground/20 h-4 w-16 rounded"></div>
                  </div>
                ) : (
                  stat.value
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}