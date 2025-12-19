"use client"

import React from "react"
import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, TrendingUp, TrendingDown, Eye, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { useSafeAccount } from "@/hooks/use-safe-wagmi"

// Types for collection data
interface Collection {
  id: number
  collection_name: string
  token_symbol: string
  collection_image: string | null
  token_address: string
  chain_id: number
  created_at: string
  deployer_address: string
  description?: string
}

export default function CreatorDashboardPage() {
  const { isDarkMode } = useTheme()
  const { address, isConnected, mounted } = useSafeAccount()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mounted) {
      if (isConnected && address) {
        fetchUserCollections(address)
      } else {
        setLoading(false)
      }
    }
  }, [mounted, isConnected, address])

  const fetchUserCollections = async (address: string) => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching collections for address:', address)
      const response = await fetch(`/api/collections?deployer=${address}`)
      console.log('API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error:', errorText)
        throw new Error(`Failed to fetch collections: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Collections data:', data)
      setCollections(data.collections || [])
    } catch (err) {
      console.error('Error fetching collections:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getCollectionAvatar = (collection: Collection) => {
    if (collection.collection_image) {
      return (
        <img 
          src={collection.collection_image} 
          alt={collection.collection_name}
          className="w-10 h-10 rounded-lg object-cover"
        />
      )
    }
    // Fallback to professional icon based on symbol
    const getIconForSymbol = (symbol: string) => {
      const iconMap: { [key: string]: React.ReactElement } = {
        'XYZ': (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
        'RNZO': (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
        'JRKY': (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
        'PNKSTR': (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        'BORED': (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        'ART': (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
          </svg>
        ),
        'DEFI': (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        'GAME': (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        'META': (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
        )
      }
      return iconMap[symbol] || (
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    }
    return getIconForSymbol(collection.token_symbol)
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
    }`}>
      <BidBopHeader />
      
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Creator Dashboard
              </h1>
              <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Manage all your deployed strategy collections
              </p>
            </div>
            <Button asChild className={`shadow-sm rounded-xl hover:scale-[1.02] transition-all duration-200 h-9 px-4 text-sm ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500' 
                : 'bg-white/80 border border-gray-200 text-gray-700 hover:bg-white hover:border-gray-300'
            }`}>
              <a href="/deploy">
                <Plus className="h-4 w-4 mr-2" />
                Deploy New Collection
              </a>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Card className={`backdrop-blur-sm shadow-sm rounded-xl hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/60' 
              : 'bg-white/70 border-gray-200/60'
          }`}>
            <CardContent className="p-3 text-center">
              <div className={`text-lg font-semibold mb-1 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {loading ? '...' : collections.length}
              </div>
              <div className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Total Collections</div>
            </CardContent>
          </Card>
          <Card className={`backdrop-blur-sm shadow-sm rounded-xl hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/60' 
              : 'bg-white/70 border-gray-200/60'
          }`}>
            <CardContent className="p-3 text-center">
              <div className={`text-lg font-semibold mb-1 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                43
              </div>
              <div className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Total NFTs</div>
            </CardContent>
          </Card>
          <Card className={`backdrop-blur-sm shadow-sm rounded-xl hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/60' 
              : 'bg-white/70 border-gray-200/60'
          }`}>
            <CardContent className="p-3 text-center">
              <div className={`text-lg font-semibold mb-1 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                39
              </div>
              <div className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Total Sales</div>
            </CardContent>
          </Card>

        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            {/* Animated Logo/Icon */}
            <div className="relative mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 animate-pulse shadow-lg"></div>
              <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 animate-spin opacity-20" style={{animationDuration: '3s'}}></div>
              <div className="absolute inset-2 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm animate-pulse"></div>
            </div>

            {/* Cool Loading Dots */}
            <div className="flex justify-center space-x-2 mb-6">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>

            {/* Progress Bar */}
            <div className="w-64 mx-auto mb-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full animate-pulse" style={{
                  width: '100%',
                  animation: 'progress 2s ease-in-out infinite'
                }}></div>
              </div>
            </div>

            {/* Loading Text */}
            <p className="text-gray-500 text-sm animate-pulse">
              Loading your collections...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className={`text-lg transition-colors duration-300 ${
              isDarkMode ? 'text-red-300' : 'text-red-600'
            }`}>
              Error: {error}
            </div>
            <Button 
              onClick={() => address && fetchUserCollections(address)}
              className="mt-2"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Wallet Not Connected State */}
        {!loading && !error && !isConnected && (
          <Card className={`backdrop-blur-sm shadow-sm rounded-2xl ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/60' 
              : 'bg-white/70 border-gray-200/60'
          }`}>
            <CardContent className="p-8 text-center">
              <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 border border-purple-500' 
                  : 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200'
              }`}>
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Connect Your Wallet</h3>
              <p className={`mb-4 text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>Connect your wallet to view your deployed collections</p>
              <Button className={`shadow-sm rounded-xl hover:scale-[1.02] transition-all duration-200 h-9 px-4 text-sm ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500' 
                  : 'bg-white/80 border border-gray-200 text-gray-700 hover:bg-white hover:border-gray-300'
              }`}>
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Collections Grid */}
        {!loading && !error && isConnected && collections.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {collections.map((collection) => (
              <Card key={collection.id} className={`backdrop-blur-sm shadow-sm rounded-2xl hover:shadow-md transition-all duration-200 hover:scale-[1.02] group overflow-hidden ${
                isDarkMode 
                  ? 'bg-gray-800/70 border-gray-700/60' 
                  : 'bg-white/70 border-gray-200/60'
              }`}>
                <CardHeader className={`pb-2 pt-3 transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-800/70' 
                    : 'bg-gradient-to-br from-gray-50/50 to-purple-50/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform duration-200 ${
                        isDarkMode 
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 border border-purple-500' 
                          : 'bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200'
                      }`}>
                        {getCollectionAvatar(collection)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className={`text-base font-semibold truncate transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>{collection.collection_name}</CardTitle>
                        <p className={`text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>${collection.token_symbol}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge 
                        className={`text-xs px-2 py-1 rounded-full ${
                          isDarkMode
                            ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        Live
                      </Badge>
                      <Badge 
                        className={`text-xs px-2 py-1 rounded-full ${
                          isDarkMode
                            ? "bg-blue-900/50 text-blue-300 border border-blue-700"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        Chain {collection.chain_id}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-3">
                  <div className="space-y-3">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`rounded-lg p-2 transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'
                      }`}>
                        <div className={`text-xs mb-1 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>Token Address</div>
                        <div className={`font-mono text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          {collection.token_address.slice(0, 6)}...{collection.token_address.slice(-4)}
                        </div>
                      </div>
                      <div className={`rounded-lg p-2 transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'
                      }`}>
                        <div className={`text-xs mb-1 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>Chain ID</div>
                        <div className={`font-semibold transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>{collection.chain_id}</div>
                      </div>
                      <div className={`rounded-lg p-2 transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'
                      }`}>
                        <div className={`text-xs mb-1 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>Created</div>
                        <div className={`font-semibold transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          {new Date(collection.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`rounded-lg p-2 transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'
                      }`}>
                        <div className={`text-xs mb-1 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>Deployer</div>
                        <div className={`font-mono text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          {collection.deployer_address.slice(0, 6)}...{collection.deployer_address.slice(-4)}
                        </div>
                      </div>
                    </div>



                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-1">
                      <Button
                        size="sm"
                        className={`flex-1 shadow-sm rounded-lg hover:scale-[1.02] transition-all duration-200 text-xs h-7 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500' 
                            : 'bg-white/80 border border-gray-200 text-gray-700 hover:bg-white hover:border-gray-300'
                        }`}
                        asChild
                      >
                        <a href={`/collections/${collection.token_symbol.toLowerCase()}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          Manage
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`flex-1 shadow-sm rounded-lg hover:scale-[1.02] transition-all duration-200 text-xs h-7 ${
                          isDarkMode 
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500' 
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Settings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State for when user has no collections */}
        {!loading && !error && isConnected && collections.length === 0 && (
          <Card className={`backdrop-blur-sm shadow-sm rounded-2xl ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/60' 
              : 'bg-white/70 border-gray-200/60'
          }`}>
            <CardContent className="p-8 text-center">
              <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 border border-purple-500' 
                  : 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200'
              }`}>
                <Plus className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>You have not created any strategy/collection</h3>
              <p className={`mb-4 text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>Deploy your first strategy collection to get started</p>
              <Button asChild className={`shadow-sm rounded-xl hover:scale-[1.02] transition-all duration-200 h-9 px-4 text-sm ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500' 
                  : 'bg-white/80 border border-gray-200 text-gray-700 hover:bg-white hover:border-gray-300'
              }`}>
                <a href="/deploy">
                  <Plus className="h-4 w-4 mr-2" />
                  Deploy Your First Collection
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <BidBopFooter />
    </div>
  )
}
