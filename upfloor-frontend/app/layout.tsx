import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { Providers } from "../lib/providers"
import { AuthGuard } from "../components/AuthGuard"

export const metadata: Metadata = {
  title: "UpFloor – UpFloor is a protocol that transforms NFT collections into perpetual growth engines.",
  description:
    "UpFloor is where amphibious explorers meet on-chain strategy tokens. Sprint into bids, roam new drops, and discover with curiosity and adaptability.",
  generator: "UpFloor",
  keywords: ["UpFloor", "DeFi", "Strategy Tokens", "Ethereum", "Bids", "Exploration", "NFT"],
  authors: [{ name: "UpFloor by DoonLabs" }],
  icons: {
    icon: [
      { url: "/brand/purplet.png" },
      { url: "/brand/purple.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/brand/purplet.png",
  },
  openGraph: {
    title: "UpFloor – Transforms NFT collections into perpetual growth engines",
    description: "UpFloor is a protocol that transforms NFT collections into perpetual growth engines. Curious. Adaptable. Ampharion spirit for explorers.",
    type: "website",
    images: ["/brand/purplet.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning={true}>
        <AuthGuard />
        <Providers>
          <Suspense fallback={null}>
            {children}
            <Analytics />
          </Suspense>
        </Providers>
      </body>
    </html>
  )
}
