"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSafeAccount } from "@/hooks/use-safe-wagmi"
import { Spinner } from "@/components/ui/spinner"
import { useTheme } from "@/components/theme-provider"

export default function TopBar() {
  const { address, isConnected } = useSafeAccount()
  const { isDarkMode, mounted } = useTheme()
  const safeIsDarkMode = mounted ? isDarkMode : false
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""

  return (
    <header className="sticky top-0 z-50 w-full bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Left: Brand + search + nav */}
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={safeIsDarkMode ? "/brand/darkmode.png" : "/brand/logotest.png"} 
              alt="BidBop logo" 
              className="h-5 w-auto" 
            />
            <span>BidBop™</span>
          </a>
          <div
            aria-label="Search Collections"
            className={cn(
              "hidden sm:flex items-center gap-2 rounded-md border border-border/60",
              "px-3 py-1.5 text-xs text-muted-foreground",
            )}
          >
            <div className="size-1.5 rounded-full bg-muted-foreground/70" aria-hidden />
            <span>Search Collections</span>
            <span className="opacity-40">/</span>
          </div>
          <nav className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
            <a href="/dashboard" className="transition-colors hover:text-foreground">
              Dashboard
            </a>
            <a href="/browse" className="transition-colors hover:text-foreground">
              Browse
            </a>
            <a href="/portfolio" className="transition-colors hover:text-foreground">
              Portfolio
            </a>
            <a href="/deploy" className="transition-colors hover:text-foreground">
              Deploy
            </a>
          </nav>
        </div>

        {/* Right: Connect + Chain Switcher */}
        <div className="flex items-center gap-2">
          {address && (
            <div className="text-sm text-muted-foreground">
              {shortAddress}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
