"use client"

import BidBopHeader from "@/components/bidbop-header"
import BidBopFooter from "@/components/bidbop-footer"
import BidBopDeployForm from "@/components/bidbop-deploy-form"
import ClientOnly from "@/components/client-only"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, Target, TrendingUp, Shield } from "lucide-react"
import { useState, useEffect } from "react"

export default function DeployLandingPage() {
  const { isDarkMode } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-4">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-2">
            <div className="text-center mb-4">
              <h1 className={`text-balance text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-black'
              }`}>
                Launch Your Strategy Token
              </h1>
              <p className={`text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Deploy your DeFi strategy token with ease. Configure, preview, and launch in minutes! ✨
              </p>
            </div>
          </div>
        </section>

        {/* Deploy Form */}
        <section className="relative overflow-hidden py-1">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-1">
            <ClientOnly fallback={
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="relative mb-6">
                    {/* Animated dots */}
                    <div className="flex space-x-2 justify-center">
                      <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    {/* Gradient text effect */}
                    <div className="mt-4 text-2xl font-black">
                      <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent animate-pulse">
                        BidBop
                      </span>
                    </div>
                  </div>
                  <p className={`text-sm font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Loading deploy form...</p>
                </div>
              </div>
            }>
              <BidBopDeployForm />
            </ClientOnly>
          </div>
        </section>

      </main>
      <BidBopFooter />
    </div>
  )
}
