"use client"

import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, TrendingUp, Eye, ShoppingCart, BarChart3, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import PriceChart from "@/components/price-chart"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data for strategy details
const mockStrategyData = {
  PNKSTR: {
    name: "PunkStrategy™",
    symbol: "PNKSTR",
    avatar: "👤",
    address: "0xc506...3eDF",
    fullAddress: "0xc5061234567890abcdef1234567890abcdef3eDF",
    description: "Advanced CryptoPunk acquisition strategy with automated buying mechanisms and yield optimization.",
    holdings: 28,
    sold: 4,
    currentValue: "14.517",
    nftCount: 28,
    metrics: {
      ethPrice: "$4337.27",
      tokenPrice: "$0.1784",
      marketCap: "$178.41M",
      volume24h: "$2.55M",
      burned: "4.50% 44,972,172",
      change24h: "+31.89%",
      change7d: "+45.23%",
      change30d: "+67.89%",
      totalSupply: "1,000,000,000",
      circulatingSupply: "955,027,828",
      holders: 1247,
      liquidity: "$12.45M",
    },
    cheapestPunk: {
      id: "#4291",
      image: "👤",
      price: "48.470",
      owner: "0x0199...8d26",
    },
    progress: {
      percentage: 29.9,
      needed: "33.9534",
      description:
        "When the machine acquires the missing 33.9534 ETH the first entity to trigger the functions will process the mechanism forward and earn a reward.",
    },
    chartData: [
      { time: "00:00", price: 0.165, volume: 1200000 },
      { time: "04:00", price: 0.168, volume: 980000 },
      { time: "08:00", price: 0.172, volume: 1450000 },
      { time: "12:00", price: 0.175, volume: 2100000 },
      { time: "16:00", price: 0.178, volume: 1800000 },
      { time: "20:00", price: 0.1784, volume: 1650000 },
    ],
    recentTrades: [
      { type: "buy", amount: "1,250", price: "0.1784", time: "2 min ago", user: "0x1234...5678" },
      { type: "sell", amount: "850", price: "0.1782", time: "5 min ago", user: "0x9876...5432" },
      { type: "buy", amount: "2,100", price: "0.1780", time: "8 min ago", user: "0x4567...8901" },
      { type: "buy", amount: "750", price: "0.1778", time: "12 min ago", user: "0x2345...6789" },
      { type: "sell", amount: "1,500", price: "0.1775", time: "15 min ago", user: "0x7890...1234" },
    ],
    nftHoldings: [
      { id: "#1234", image: "👤", price: "52.1", acquired: "2 days ago" },
      { id: "#5678", image: "👤", price: "48.9", acquired: "1 week ago" },
      { id: "#9012", image: "👤", price: "51.3", acquired: "2 weeks ago" },
      { id: "#3456", image: "👤", price: "49.7", acquired: "3 weeks ago" },
    ],
    tokenHolders: [
      { address: "0x12A3...9F10", balance: 182_340, percent: 14.6 },
      { address: "0x45bC...77d2", balance: 129_500, percent: 10.4 },
      { address: "0x9Dde...11A4", balance: 98_200, percent: 7.9 },
      { address: "0x3f0a...5c7E", balance: 65_010, percent: 5.2 },
      { address: "0xb7e1...D9c3", balance: 52_440, percent: 4.2 },
    ],
  },
}

export default function StrategyViewPage() {
  const params = useParams()
  const symbol = params.symbol as string
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    setMounted(true)
  }, [])

  const strategy = mockStrategyData[symbol as keyof typeof mockStrategyData]

  if (!strategy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <BidBopHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800">Strategy not found</h1>
            <p className="text-slate-600 mt-2">The strategy "{symbol}" could not be found.</p>
          </div>
        </main>
        <BidBopFooter />
      </div>
    )
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-white">
      <BidBopHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Strategy Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-2xl">
                {strategy.avatar}
              </div>
              <div>
                <h1 className="text-4xl font-black">
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent drop-shadow-2xl">
                      {strategy.name}
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent blur-sm opacity-75">
                      {strategy.name}
                    </span>
                  </span>
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-600 font-mono">{strategy.address}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(strategy.fullAddress, "address")}
                    >
                      {copied === "address" ? <span className="text-emerald-600">✓</span> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    Holding {strategy.holdings} CryptoPunks
                  </Badge>
                  <Badge variant="outline" className="border-slate-300 text-slate-700">Sold {strategy.sold}</Badge>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                <Eye className="h-4 w-4 mr-2" />
                Watch
              </Button>
              <Button className="bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105" onClick={() => setActiveTab("trades")}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Trade $PNKSTR
              </Button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">ETH Price</div>
                <div className="text-lg font-semibold text-gray-800">{strategy.metrics.ethPrice}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">PNKSTR Price</div>
                <div className="text-lg font-semibold text-gray-800">{strategy.metrics.tokenPrice}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Market Cap</div>
                <div className="text-lg font-semibold text-gray-800">{strategy.metrics.marketCap}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">24h Volume</div>
                <div className="text-lg font-semibold text-gray-800">{strategy.metrics.volume24h}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Burned</div>
                <div className="text-lg font-semibold text-gray-800">{strategy.metrics.burned}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">24h Change</div>
                <div className="text-lg font-semibold text-emerald-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {strategy.metrics.change24h}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="holders">Holders</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Current Holdings */}
            <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">{strategy.name} is currently holding</h2>
                <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">{strategy.currentValue} ETH</div>
                <div className="text-xl text-gray-600">+ {strategy.nftCount} NFTs</div>
              </CardContent>
            </Card>

            {/* Strategy Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <CardHeader className="pb-4 bg-gradient-to-br from-gray-50 to-purple-50/30">
                  <CardTitle className="flex items-center space-x-2 text-gray-800">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    <span>Strategy Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">7d Change</span>
                    <span className="text-emerald-600 font-semibold">{strategy.metrics.change7d}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">30d Change</span>
                    <span className="text-emerald-600 font-semibold">{strategy.metrics.change30d}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Total Supply</span>
                    <span className="font-semibold text-gray-800">{strategy.metrics.totalSupply}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Circulating</span>
                    <span className="font-semibold text-gray-800">{strategy.metrics.circulatingSupply}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Holders</span>
                    <span className="font-semibold text-gray-800">{strategy.metrics.holders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Liquidity</span>
                    <span className="font-semibold text-gray-800">{strategy.metrics.liquidity}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <CardHeader className="pb-4 bg-gradient-to-br from-gray-50 to-purple-50/30">
                  <CardTitle className="flex items-center space-x-2 text-gray-800">
                    <Activity className="h-5 w-5 text-purple-500" />
                    <span>Strategy Info</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4">{strategy.description}</p>

                  {/* Progress Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">Progress</span>
                      <span className="text-sm text-gray-500">{strategy.progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${strategy.progress.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{strategy.progress.description}</p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                        Need {strategy.progress.needed} more ETH
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                        No ETH to Convert
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cheapest CryptoPunks */}
            <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <CardHeader className="pb-4 bg-gradient-to-br from-gray-50 to-purple-50/30">
                <CardTitle className="flex items-center justify-between text-gray-800">
                  <span>Cheapest CryptoPunks on Market</span>
                  <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                    View on Marketplace
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-3xl shadow-lg">
                    {strategy.cheapestPunk.image}
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-bold mb-2 text-gray-800">{strategy.cheapestPunk.price} ETH</div>
                    <div className="text-sm text-gray-600">Owner {strategy.cheapestPunk.owner}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chart Tab */}
          <TabsContent value="chart" className="space-y-6">
            <PriceChart
              data={strategy.chartData}
              currentPrice={strategy.metrics.tokenPrice}
              change24h={strategy.metrics.change24h}
              symbol={strategy.symbol}
            />
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <CardHeader className="pb-4 bg-gradient-to-br from-gray-50 to-purple-50/30">
                <CardTitle className="text-gray-800">Price (last intervals)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ChartContainer
                  className="h-64"
                  config={{
                    price: { label: "Price", color: "hsl(var(--chart-1))" },
                  }}
                >
                  <BarChart data={strategy.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="price" fill="var(--color-price)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <CardHeader className="pb-4 bg-gradient-to-br from-gray-50 to-purple-50/30">
                <CardTitle className="text-gray-800">Recent Trades</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {strategy.recentTrades.map((trade, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        {trade.type === "buy" ? (
                          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="font-semibold text-gray-800">
                            {trade.type === "buy" ? "Buy" : "Sell"} {trade.amount} PNKSTR
                          </div>
                          <div className="text-sm text-gray-500">
                            {trade.user} • {trade.time}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-800">${trade.price}</div>
                        <div className="text-sm text-gray-500">
                          ${(Number.parseFloat(trade.amount) * Number.parseFloat(trade.price)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holdings Tab */}
          <TabsContent value="holdings" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <CardHeader className="pb-4 bg-gradient-to-br from-gray-50 to-purple-50/30">
                <CardTitle className="text-gray-800">NFT Holdings</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {strategy.nftHoldings.map((nft, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-2xl shadow-lg">
                        {nft.image}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">CryptoPunk {nft.id}</div>
                        <div className="text-sm text-gray-500">Acquired {nft.acquired}</div>
                        <div className="text-sm font-semibold text-emerald-600">{nft.price} ETH</div>
                      </div>
                      <Button size="sm" variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holders Tab */}
          <TabsContent value="holders" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <CardHeader className="pb-4 bg-gradient-to-br from-gray-50 to-purple-50/30">
                <CardTitle className="text-gray-800">Token Holders</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] text-gray-600">#</TableHead>
                      <TableHead className="text-gray-600">Address</TableHead>
                      <TableHead className="text-right text-gray-600">Balance</TableHead>
                      <TableHead className="text-right text-gray-600">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategy.tokenHolders?.map((h: any, i: number) => (
                      <TableRow key={h.address}>
                        <TableCell className="font-medium text-gray-800">{i + 1}</TableCell>
                        <TableCell className="font-mono text-gray-800">{h.address}</TableCell>
                        <TableCell className="text-right text-gray-800">
                          {h.balance.toLocaleString()} {strategy.symbol}
                        </TableCell>
                        <TableCell className="text-right text-gray-800">{h.percent}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
