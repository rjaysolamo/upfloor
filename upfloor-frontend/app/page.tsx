"use client"

import BidBopHeader from "@/components/bidbop-header"
import BidBopHero from "@/components/bidbop-hero"
import BidBopFooter from "@/components/bidbop-footer"
import { useTheme } from "@/components/theme-provider"
import HorizontalStatsBar from "@/components/horizontal-stats-bar"
import DisplayTrendingToken from "@/components/display-trending-token"
import { useState, useEffect } from "react"

export default function Page() {
  const { isDarkMode } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <BidBopHeader />
      <main>
        <BidBopHero />
        {/* Deployment form has been removed; deployment is now on /deployyoken */}
        <section className="container mx-auto px-4 py-10 md:py-14">
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="text-pretty text-2xl md:text-3xl font-semibold">
                Turn any collection into a perpetual machine
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The protocol will automatically buy and list floor NFTs for a profit, using the trading fees generated
                by the token.
              </p>
              <p className="mt-2 text-sm text-muted-foreground/80">deploy • trade • bid • grow</p>
            </div>

            <div className="rounded-lg border border-border/60 bg-secondary/20 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/strategies-dashboard.png"
                alt="Example dashboard with market stats and strategy table"
                className="w-full rounded-md object-cover"
              />
            </div>
          </div>
        </section>

        <HorizontalStatsBar />
        <DisplayTrendingToken />
      </main>
      <BidBopFooter />
    </div>
  )
}
