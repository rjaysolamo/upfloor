import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function AvatarBubble({
  src,
  alt,
  className,
  size = 56,
}: {
  src: string
  alt: string
  className?: string
  size?: number
}) {
  return (
    <div
      className={cn(
        "absolute rounded-full border border-border/60 shadow-[0_0_0_2px_var(--color-background)]",
        "bg-card overflow-hidden",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={alt}
      role="img"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src || "/placeholder.svg"} alt={alt} className="h-full w-full object-cover" loading="lazy" />
    </div>
  )
}

export default function OrbitHero() {
  return (
    <section className="relative isolate">
      {/* Background */}
      <div
        className={cn("pointer-events-none absolute inset-0 -z-10", "bg-background")}
        aria-hidden
        style={{
          // Crisper concentric rings and a subtle square grid
          backgroundImage: `
            /* fine dot at center */
            radial-gradient(circle at 50% 45%, rgba(255 255 255 / 0.05) 1px, transparent 1.5px),
            /* main rings every 180px with soft glow */
            repeating-radial-gradient(circle at 50% 45%, rgba(255 255 255 / 0.05) 0 1px, transparent 1px 180px),
            /* inner helper ring for density */
            repeating-radial-gradient(circle at 50% 45%, rgba(255 255 255 / 0.03) 0 1px, transparent 1px 90px),
            /* vertical and horizontal grid */
            repeating-linear-gradient(0deg, rgba(255 255 255 / 0.03) 0 1px, transparent 1px 160px),
            repeating-linear-gradient(90deg, rgba(255 255 255 / 0.03) 0 1px, transparent 1px 160px)
          `,
          backgroundBlendMode: "normal, screen, normal, normal, normal",
        }}
      />
      {/* Soft vignette to fade edges */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          maskImage: "radial-gradient(1200px 1200px at 50% 45%, black 60%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(1200px 1200px at 50% 45%, black 60%, transparent 100%)",
          background: "radial-gradient(1200px 1200px at 50% 45%, rgba(0 0 0 / 0) 60%, rgba(0 0 0 / 0.45) 100%)",
        }}
      />

      <div className="mx-auto flex min-h-[calc(100svh-56px)] max-w-6xl flex-col justify-end px-4 pb-8 pt-24 md:pb-10 lg:pb-16">
        {/* Token bubbles positioned around the center */}
        <div className="pointer-events-none relative -z-0 mx-auto mb-16 h-[56svh] w-full max-w-3xl">
          {/* Center avatar */}
          <AvatarBubble
            src={"/placeholder.svg?height=220&width=220&query=pixel avatar center"}
            alt="Center avatar"
            size={160}
            className="left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2"
          />
          {/* Surrounding small avatars */}
          <AvatarBubble
            src={"/placeholder.svg?height=80&width=80&query=nft badge"}
            alt="Badge"
            size={52}
            className="left-[60%] top-[20%] -translate-x-1/2 -translate-y-1/2"
          />
          <AvatarBubble
            src={"/placeholder.svg?height=80&width=80&query=token"}
            alt="Token"
            size={46}
            className="left-[34%] top-[52%] -translate-x-1/2 -translate-y-1/2"
          />
          <AvatarBubble
            src={"/placeholder.svg?height=80&width=80&query=avatar a"}
            alt="Avatar A"
            size={48}
            className="left-[28%] top-[66%] -translate-x-1/2 -translate-y-1/2"
          />
          <AvatarBubble
            src={"/placeholder.svg?height=80&width=80&query=avatar b"}
            alt="Avatar B"
            size={48}
            className="left-[73%] top-[72%] -translate-x-1/2 -translate-y-1/2"
          />
          <AvatarBubble
            src={"/placeholder.svg?height=80&width=80&query=logo"}
            alt="Logo"
            size={44}
            className="left-[56%] top-[58%] -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        {/* Left column content (like screenshot) */}
        <div className="grid items-end gap-6 md:grid-cols-[minmax(0,1fr)]">
          <div className="max-w-2xl">
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-6xl lg:text-7xl">
              Turn any collection
              <br />
              into a perpetual machine
            </h1>

            <Card className="mt-6 w-full max-w-[34rem] border-border/50 bg-secondary/30">
              <CardContent className="p-4 text-sm text-muted-foreground">
                The protocol will automatically buy and list floor NFTs for a profit, using the trading fees generated
                by the token.
              </CardContent>
            </Card>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm" className="h-8 rounded-md px-3">
                Deploy a token
              </Button>
              <Button size="sm" variant="secondary" className="h-8 rounded-md px-3">
                Browse Strategies™
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom stat pills */}
        <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.2fr)]">
          <StatPill label="Total Market Cap" value="$201.55M" />
          <StatPill label="Total 24h Volume" value="$14.17M" />
          <StatPill label="Collections" value="1,254" />
          <TopPerformerPill name="VibeStrategy" change="+3766.54%" />
        </div>
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  )
}

function TopPerformerPill({
  name,
  change,
}: {
  name: string
  change: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="size-5 rounded-md bg-accent/30" aria-hidden />
        <div className="truncate">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Top Performer</div>
          <div className="text-sm font-medium">{name}</div>
        </div>
      </div>
      <div className="shrink-0">
        <span className="rounded-md bg-[oklch(0.75_0.15_150)]/15 px-2 py-1 text-xs font-semibold text-[oklch(0.75_0.15_150)]">
          {change}
        </span>
      </div>
    </div>
  )
}
