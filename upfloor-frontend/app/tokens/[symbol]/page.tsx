import TopBar from "@/components/top-bar"
import TokenStatsStrip from "@/components/token-stats-strip"
import PriceChart from "@/components/price-chart"
import { Progress } from "@/components/ui/progress"

export default function TokenPage({ params }: { params: { symbol: string } }) {
  const symbol = (params.symbol || "TOKEN").toUpperCase()
  const name = `${symbol}Strategy™`

  return (
    <div className="dark">
      <TopBar />
      <main className="relative isolate">
        {/* Cool grid background */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-background"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, color-mix(in oklch, var(--color-foreground) 5%, transparent) 0 1px, transparent 1px 160px), repeating-linear-gradient(90deg, color-mix(in oklch, var(--color-foreground) 5%, transparent) 0 1px, transparent 1px 160px)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
          {/* Title row */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pixel-avatar.png"
              alt={`${name} avatar`}
              className="h-10 w-10 rounded-md border border-border/60 bg-card"
            />
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <span className="ml-auto rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground">
              0xc5e6…3e0F
            </span>
          </div>

          {/* Stats strip */}
          <div className="mt-4">
            <TokenStatsStrip />
          </div>

          {/* Big holding block */}
          <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="rounded-md border border-border/60 bg-background/40 p-4 md:p-6">
              <div className="text-sm font-medium text-muted-foreground">{name} is currently holding</div>
              <div className="mt-2 text-pretty text-5xl font-extrabold md:text-7xl">14.482 ETH</div>
              <div className="mt-1 text-muted-foreground">+ 28 NFTs</div>
              <div className="mt-6 rounded-md border border-border/60 bg-background/60 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Machine progress</span>
                  <span>29.9%</span>
                </div>
                <div className="mt-2">
                  <Progress value={29.9} className="h-2" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="inline-flex h-8 items-center rounded-md bg-[var(--brand-lemon)] px-3 text-xs font-medium text-background">
                    Need 33.988 more ETH
                  </button>
                  <button className="inline-flex h-8 items-center rounded-md border border-border/60 bg-transparent px-3 text-xs">
                    No ETH to Convert
                  </button>
                </div>
              </div>
            </div>

            <aside className="rounded-md border border-border/60 bg-background/40 p-4 md:p-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>#4291</span>
                <button className="rounded-md border border-border/60 px-2 py-1">View on Marketplace</button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/crypto-punk-pixel.jpg"
                alt="Cheapest NFT on Market"
                className="mt-2 h-64 w-full rounded-md border border-border/60 bg-card object-cover"
              />
              <div className="mt-3 text-sm text-muted-foreground">Cheapest on Market</div>
              <div className="text-4xl font-extrabold">48.470 ETH</div>
              <div className="text-xs text-muted-foreground">Owner 0x0199…8026</div>
            </aside>
          </section>

          {/* Chart */}
          <section className="mt-4">
            <PriceChart data={[]} currentPrice={""} change24h={""} symbol={""} />
          </section>
        </div>
      </main>
    </div>
  )
}
