"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import BidBopDeployForm from "@/components/bidbop-deploy-form"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export default function DeployTokenPage() {
  const params = useSearchParams()
  const devBypass = params.get("dev") === "1"
  const { isDarkMode } = useTheme()

  // wallet connection state
  const [account, setAccount] = useState<string | null>(null)
  const canShowForm = Boolean(account) || devBypass

  useEffect(() => {
    // check if already connected
    const check = async () => {
      if (typeof window === "undefined") return
      // @ts-ignore
      const eth = (window as any).ethereum
      try {
        if (!eth) return
        const accs: string[] = await eth.request?.({ method: "eth_accounts" })
        if (accs && accs[0]) setAccount(accs[0])
        // listen for account changes
        eth?.on?.("accountsChanged", (accs: string[]) => setAccount(accs?.[0] ?? null))
      } catch {
        // ignore
      }
    }
    check()
    return () => {
      if (typeof window === "undefined") return
      // @ts-ignore
      const eth = (window as any).ethereum
      eth?.removeListener?.("accountsChanged", () => {})
    }
  }, [])

  async function onConnect() {
    try {
      // @ts-ignore
      const eth = (window as any).ethereum
      if (!eth?.request) {
        alert("No wallet provider detected. Please install a wallet like MetaMask and try again.")
        return
      }
      const accs: string[] = await eth.request({ method: "eth_requestAccounts" })
      setAccount(accs?.[0] ?? null)
    } catch (err) {
      console.error("[v0] wallet connect error:", err)
      alert("Could not connect wallet. Please try again.")
    }
  }

  if (!canShowForm) {
    return (
      <main className={`min-h-screen transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
      }`}>
        <section className="relative overflow-hidden">
          {/* Smooth shader gradient hero in BidBop palette */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(60%_50%_at_50%_0%,theme(colors.brand.accent)/35,transparent),conic-gradient(from_180deg_at_30%_20%,theme(colors.brand.primary),theme(colors.brand.info),theme(colors.brand.primary))]" />
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-20">
            <h1 className={`text-balance text-2xl sm:text-3xl md:text-4xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Deploy a Strategy Token</h1>
            <p className={`mt-3 max-w-2xl text-pretty text-sm sm:text-base transition-colors duration-300 ${
              isDarkMode ? 'text-white/85' : 'text-gray-600'
            }`}>
              Connect your Web3 wallet to start. BidBop empowers curious, adaptable explorers to launch fast.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={onConnect} className="bg-(--brand-primary) hover:opacity-90">
                {account ? "Wallet Connected" : "Connect Wallet"}
              </Button>
              <Button asChild variant="secondary">
                <Link href="/dashboard">Preview Dashboard</Link>
              </Button>
            </div>
            <p className={`mt-3 text-xs transition-colors duration-300 ${
              isDarkMode ? 'text-white/70' : 'text-gray-500'
            }`}>
              Dev note: append ?dev=1 to preview the deploy form without a wallet.
            </p>
          </div>
        </section>
      </main>
    )
  }

  return <BidBopDeployForm />
}
