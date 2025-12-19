"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react"

function label(v?: string) {
  return v && v.trim() ? v : "—"
}

// Custom debounce hook for better performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

type SymbolCheckResult = {
  symbol: string
  isAvailable: boolean
  existingTokens: Array<{
    symbol: string
    name: string
    chainId: number
    networkName: string
    createdAt: string
  }>
  message: string
}

export default function DeployPreviewPage() {
  const params = useSearchParams()
  const name = params.get("name") || ""
  const symbol = params.get("symbol") || ""
  const collection = params.get("collection") || ""
  const royalties = params.get("royalties") || ""
  const website = params.get("website") || ""
  const twitter = params.get("twitter") || ""
  const discord = params.get("discord") || ""
  const solverAddr = params.get("solverAddr") || ""
  const solverPrefundEth = params.get("solverPrefundEth") || ""
  const chainId = params.get("chainId") || ""

  const [symbolCheck, setSymbolCheck] = useState<SymbolCheckResult | null>(null)
  const [checkingSymbol, setCheckingSymbol] = useState(false)
  const [symbolError, setSymbolError] = useState<string | null>(null)

  // Debounced symbol for faster validation
  const debouncedSymbol = useDebounce(symbol, 200)

  // Real-time symbol validation
  const checkSymbolAvailability = useCallback(async (symbolToCheck: string) => {
    if (!symbolToCheck || !symbolToCheck.trim()) {
      setSymbolCheck(null)
      setSymbolError(null)
      return
    }

    try {
      setCheckingSymbol(true)
      setSymbolError(null)
      
      const response = await fetch(`/api/check-symbol?symbol=${encodeURIComponent(symbolToCheck)}&chainId=${chainId}`)
      const result = await response.json()
      
      if (result.success) {
        setSymbolCheck(result)
      } else {
        setSymbolError(result.error || "Failed to check symbol availability")
      }
    } catch (error) {
      console.error("Error checking symbol:", error)
      setSymbolError("Failed to check symbol availability")
    } finally {
      setCheckingSymbol(false)
    }
  }, [chainId])

  // Check symbol when debounced value changes
  useEffect(() => {
    checkSymbolAvailability(debouncedSymbol)
  }, [debouncedSymbol, checkSymbolAvailability])

  return (
    <div className="min-h-screen bg-white">
      <BidBopHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden py-8">
          <div className="relative mx-auto max-w-6xl px-4 py-8">
            <h1 className="text-balance text-3xl font-bold sm:text-4xl text-black mb-4">Preview Dashboard</h1>
            <p className="mt-3 max-w-2xl text-pretty text-gray-600 text-lg">
              Confirm your configuration before going live. You can go back to adjust any field.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                <a href="/deploy#deploy">Edit</a>
              </Button>
              <Button 
                asChild 
                disabled={symbolCheck ? !symbolCheck.isAvailable : false}
                className="bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 border border-purple-200 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <a href={symbolCheck && !symbolCheck.isAvailable ? "#" : `/collections/${symbol.toLowerCase()}`}>
                  {symbolCheck && !symbolCheck.isAvailable ? "Symbol Not Available" : "Deploy & Manage Collection"}
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Symbol Validation Alert */}
        {symbol && (
          <section className="mx-auto max-w-6xl px-4 py-4">
            {checkingSymbol ? (
              <Alert className="border-blue-200 bg-blue-50">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Checking symbol availability...
                </AlertDescription>
              </Alert>
            ) : symbolError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {symbolError}
                </AlertDescription>
              </Alert>
            ) : symbolCheck ? (
              symbolCheck.isAvailable ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✅ Symbol "{symbolCheck.symbol}" is available and ready to use!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">
                        ⚠️ Symbol "{symbolCheck.symbol}" is already in use!
                      </p>
                      <p className="text-sm">
                        Please choose a different symbol to avoid conflicts. Existing tokens with this symbol:
                      </p>
                      <div className="space-y-1">
                        {symbolCheck.existingTokens.map((token, index) => (
                          <div key={index} className="text-sm bg-red-100 p-2 rounded border">
                            <div className="font-medium">{token.name} ({token.symbol})</div>
                            <div className="text-red-600">
                              {token.networkName} • Created {new Date(token.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm font-medium">
                        💡 Consider using a more unique symbol like "{symbolCheck.symbol}2", "{symbolCheck.symbol}V2", or "{symbolCheck.symbol}NEW"
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )
            ) : null}
          </section>
        )}

        {/* Summary */}
        <section className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3 bg-gradient-to-br from-gray-50 to-purple-50/30">
              <CardTitle className="text-gray-800">Token Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm p-4">
              <Row k="Name" v={label(name)} />
              <Row k="Symbol" v={label(symbol)} mono />
              <Row k="Network (chainId)" v={label(chainId)} mono />
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3 bg-gradient-to-br from-gray-50 to-purple-50/30">
              <CardTitle className="text-gray-800">Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm p-4">
              <Row k="Collection" v={label(collection)} mono />
              <Row k="Royalties" v={label(royalties)} mono />
              <Row k="Solver Address" v={label(solverAddr)} mono />
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3 bg-gradient-to-br from-gray-50 to-purple-50/30">
              <CardTitle className="text-gray-800">Socials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm p-4">
              <Row k="Website" v={label(website)} />
              <Row k="Twitter" v={label(twitter)} />
              <Row k="Discord" v={label(discord)} />
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3 bg-gradient-to-br from-gray-50 to-purple-50/30">
              <CardTitle className="text-gray-800">Funding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm p-4">
              <Row k="Prefund (ETH)" v={label(solverPrefundEth)} mono />
              <div className="text-xs text-gray-500">
                Note: This is a preview only. Funding and deployment are not executed on this step.
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <BidBopFooter />
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{k}</span>
      <span className={`${mono ? "font-mono" : ""} truncate text-gray-800 font-semibold`}>{v}</span>
    </div>
  )
}
