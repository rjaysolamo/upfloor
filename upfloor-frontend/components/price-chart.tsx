"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ChartData {
  time: string
  price: number
  volume: number
}

interface PriceChartProps {
  data: ChartData[]
  currentPrice: string
  change24h: string
  symbol: string
}

export default function PriceChart({ data, currentPrice, change24h, symbol }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState("15m")
  
  const maxPrice = Math.max(...data.map(d => d.price))
  const minPrice = Math.min(...data.map(d => d.price))
  const priceRange = maxPrice - minPrice

  const timeframes = [
    { label: "1D", value: "1d" },
    { label: "7D", value: "7d" },
    { label: "15M", value: "15m" },
    { label: "1H", value: "1h" },
    { label: "4H", value: "4h" },
  ]

  return (
    <Card className="citrus-border-gradient bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{symbol}/USD Price Chart</span>
          <div className="flex space-x-2">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                size="sm"
                variant={timeframe === tf.value ? "default" : "outline"}
                className={timeframe === tf.value ? "bg-brand-lemon/20" : ""}
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chart Area */}
        <div className="h-80 bg-muted/20 rounded-lg p-4 relative mb-4">
          <div className="absolute top-4 right-4 text-sm text-muted-foreground">
            {symbol}/USD - {timeframe} Uniswap V4 (Ethereum)
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-2 top-4 bottom-4 flex flex-col justify-between text-xs text-muted-foreground">
            <span>{(maxPrice + priceRange * 0.1).toFixed(4)}</span>
            <span>{(maxPrice - priceRange * 0.5).toFixed(4)}</span>
            <span>{(minPrice - priceRange * 0.1).toFixed(4)}</span>
          </div>
          
          {/* Chart Bars */}
          <div className="h-full ml-12 flex items-end justify-between space-x-1">
            {data.map((point, index) => {
              const height = ((point.price - minPrice) / priceRange) * 100
              return (
                <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                  <div 
                    className="w-full bg-gradient-to-t from-brand-lemon to-brand-lime rounded-t min-h-[2px] transition-all duration-300 hover:from-brand-lime hover:to-brand-orange"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${point.time}: $${point.price.toFixed(4)}`}
                  />
                  <span className="text-xs text-muted-foreground">{point.time}</span>
                </div>
              )
            })}
          </div>
          
          {/* Current Price Line */}
          <div 
            className="absolute left-12 right-4 h-px bg-brand-lime/70 z-10"
            style={{ top: `${100 - ((parseFloat(currentPrice.replace('$', '')) - minPrice) / priceRange) * 100}%` }}
          >
            <div className="absolute -top-2 right-0 text-xs bg-background px-2 text-brand-lime font-semibold">
              {currentPrice}
            </div>
          </div>
        </div>
        
        {/* Chart Stats */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Open</div>
            <div className="font-semibold">0.1781</div>
          </div>
          <div>
            <div className="text-muted-foreground">High</div>
            <div className="font-semibold">0.1784</div>
          </div>
          <div>
            <div className="text-muted-foreground">Low</div>
            <div className="font-semibold">0.1781</div>
          </div>
          <div>
            <div className="text-muted-foreground">Close</div>
            <div className="font-semibold text-brand-lime">
              {currentPrice} {change24h}
            </div>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3">Volume</h4>
          <div className="h-16 bg-muted/20 rounded-lg p-2 flex items-end justify-between space-x-1">
            {data.map((point, index) => {
              const maxVolume = Math.max(...data.map(d => d.volume))
              const height = (point.volume / maxVolume) * 100
              return (
                <div
                  key={index}
                  className="flex-1 bg-brand-orange/30 rounded-t min-h-[2px] transition-all duration-300 hover:bg-brand-orange/50"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${point.time}: ${point.volume.toLocaleString()}`}
                />
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
