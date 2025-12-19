import { cn } from "@/lib/utils"

export function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-sm font-medium", positive && "text-[oklch(0.75_0.15_150)]")}>{value}</div>
    </div>
  )
}

export default function TokenStatsStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
      <Stat label="ETH Price" value="$4324.56" />
      <Stat label="Token Price" value="$0.1777" />
      <Stat label="Market Cap" value="$177.72M" />
      <Stat label="24h Volume" value="$2.59M" />
      <Stat label="Burned" value="4.50%" />
      <Stat label="24h Change" value="+32.17%" positive />
    </div>
  )
}
