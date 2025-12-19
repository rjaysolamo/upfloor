"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useRainbowWallet } from "@/hooks/use-rainbow-wallet"

type FormState = {
  name: string
  symbol: string
  collection: string
  royalties: string
}

const isEthAddress = (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v.trim())

function ExplorerBase(chainId?: string) {
  switch (chainId?.toLowerCase()) {
    case "0x1":
      return "https://etherscan.io"
    case "0xaa36a7": // Sepolia
      return "https://sepolia.etherscan.io"
    default:
      return "https://etherscan.io"
  }
}

export default function DeployForm() {
  const { address, chainId, isConnected, isConnecting, hasProvider, connect } = useRainbowWallet()
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""
  const [form, setForm] = useState<FormState>({ name: "", symbol: "", collection: "", royalties: "" })
  const [errors, setErrors] = useState<Record<keyof FormState, string | undefined>>({
    name: undefined,
    symbol: undefined,
    collection: undefined,
    royalties: undefined,
  })
  const [submitting, setSubmitting] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const [deployError, setDeployError] = useState<string | undefined>()
  const [contractAddress] = useState<string>("0x0000000000000000000000000000000000000000") // placeholder
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (address && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [address])

  const connected = !!address

  const isValid = useMemo(() => {
    const e: typeof errors = { name: undefined, symbol: undefined, collection: undefined, royalties: undefined }
    if (!form.name.trim()) e.name = "Token name is required"
    if (!form.symbol.trim()) e.symbol = "Symbol is required"
    if (form.symbol.trim().length > 10) e.symbol = "Max 10 characters"
    if (!isEthAddress(form.collection)) e.collection = "Enter a valid Ethereum address"
    if (!isEthAddress(form.royalties)) e.royalties = "Enter a valid Ethereum address"
    setErrors(e)
    return Object.values(e).every((v) => !v)
  }, [form])

  const onChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const slugFromSymbol = (s: string) =>
    (s || "token")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!connected) return
    if (!isValid) return
    setSubmitting(true)
    setDeployError(undefined)
    setTxHash(undefined)

    try {
      // Minimal transaction via MetaMask to provide a real hash (not actual deployment).
      // Sends a 0 ETH tx to self; replace with actual contract deployment in production.
      const tx = await window.ethereum?.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: address,
            value: "0x0",
            data: "0x",
          },
        ],
      })
      if (typeof tx === "string") {
        setTxHash(tx)
      } else {
        throw new Error("No transaction hash returned")
      }
    } catch (err: any) {
      setDeployError(err?.message || "Deployment failed")
    } finally {
      setSubmitting(false)
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
  }

  return (
    <section ref={sectionRef} id="deploy" className="mx-auto max-w-6xl px-4 pb-20">
      <Card className="border-border/60 bg-background/50">
        <CardHeader>
          <CardTitle>Deploy Strategy Token</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Wallet row */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-secondary/20 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="size-2 rounded-full"
                style={{ background: connected ? "oklch(0.75 0.15 150)" : "var(--color-border)" }}
                aria-hidden
              />
              {connected ? (
                <span className="text-foreground">Connected: {shortAddress}</span>
              ) : (
                <span className="text-muted-foreground">Wallet not connected</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!hasProvider && <span className="text-xs text-muted-foreground">Install MetaMask to continue</span>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={connect}
                disabled={isConnecting || !hasProvider}
                className="h-8 rounded-md bg-transparent"
              >
                {isConnecting ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-3" />
                    Connecting…
                  </span>
                ) : connected ? (
                  "Connected"
                ) : (
                  "Connect Wallet"
                )}
              </Button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name</Label>
              <Input
                id="name"
                placeholder="e.g., VibeStrategy Token"
                value={form.name}
                onChange={onChange("name")}
                disabled={!connected || submitting}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Token Symbol</Label>
              <Input
                id="symbol"
                placeholder="e.g., VIBE"
                value={form.symbol}
                onChange={onChange("symbol")}
                disabled={!connected || submitting}
              />
              {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="collection">Collection Address</Label>
              <Input
                id="collection"
                placeholder="0x…"
                value={form.collection}
                onChange={onChange("collection")}
                disabled={!connected || submitting}
              />
              {errors.collection && <p className="text-xs text-destructive">{errors.collection}</p>}
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="royalties">Royalties Address</Label>
              <Input
                id="royalties"
                placeholder="0x…"
                value={form.royalties}
                onChange={onChange("royalties")}
                disabled={!connected || submitting}
              />
              {errors.royalties && <p className="text-xs text-destructive">{errors.royalties}</p>}
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={!connected || submitting || !isValid}
                className="w-full rounded-md bg-gradient-to-r from-[oklch(0.75_0.2_300)] to-[oklch(0.75_0.2_240)] text-background"
              >
                {submitting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Spinner className="size-4" /> Deploying…
                  </span>
                ) : (
                  "Deploy"
                )}
              </Button>
              {!connected && (
                <p className="mt-2 text-center text-xs text-muted-foreground">Connect your wallet to enable the form</p>
              )}
            </div>
          </form>

          {/* Result */}
          {deployError && (
            <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {deployError}
            </div>
          )}

          {txHash && (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="border-border/60 bg-background/40">
                <CardHeader>
                  <CardTitle className="text-base">Deployment Successful</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Transaction</span>
                    <a
                      className="truncate text-foreground underline-offset-4 hover:underline"
                      href={`${ExplorerBase(chainId?.toString())}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {txHash}
                    </a>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Strategy Token</span>
                    <div className="flex items-center gap-2">
                      <span className="truncate">{contractAddress}</span>
                      <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => copy(contractAddress)}>
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-background/40">
                <CardHeader>
                  <CardTitle className="text-base">Next Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Configure parameters, mint initial supply, and update documentation. Replace this demo deployment
                    flow with your actual contract creation call.
                  </p>
                  <a
                    href={`/tokens/${slugFromSymbol(form.symbol)}`}
                    className="inline-flex h-8 items-center rounded-md bg-[var(--brand-lemon)] px-3 text-xs font-medium text-background"
                  >
                    View Token Page
                  </a>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
