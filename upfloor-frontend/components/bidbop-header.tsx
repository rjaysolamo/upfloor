"use client"

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useEffect, useState } from "react"
import ClientOnly from "@/components/client-only"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/components/theme-provider"

export default function BidBopHeader() {
  const [mounted, setMounted] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by using default values until mounted
  const safeIsDarkMode = mounted ? isDarkMode : false

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Dynamic background based on theme
  const getHeaderBackground = () => {
    return safeIsDarkMode ? "#111827" : "#ffffff" // gray-900 or white
  }

  const getBorderColor = () => {
    return safeIsDarkMode ? "border-gray-700" : "border-gray-200"
  }

  return (
      <header className={`sticky top-0 z-50 w-full border-b ${getBorderColor()} backdrop-blur-xl transition-all duration-500 ease-in-out shadow-lg shadow-black/5`} style={{backgroundColor: getHeaderBackground()}}>
      <div className={`w-full flex h-16 items-center justify-between px-4 sm:px-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
        safeIsDarkMode 
          ? 'bg-gray-800/10 border-gray-600/20' 
          : 'bg-white/10 border-white/20'
      }`}>
        {/* Logo and Branding */}
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
          <a href="/" className="group flex items-center space-x-2 sm:space-x-3 md:space-x-4 hover:scale-105 transition-all duration-300 ease-out">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={safeIsDarkMode ? "/brand/darkmode.png" : "/brand/logotest.png"} 
              alt="Upfloor.co logo" 
              className="h-10 w-auto sm:h-12 sm:w-auto md:h-14 md:w-auto transition-all duration-300" 
            />
          </a>
        </div>

        {/* Navigation Links - Centered (Desktop Only) */}
        <nav className={`hidden lg:flex items-center space-x-2 absolute left-1/2 transform -translate-x-1/2 rounded-full px-6 py-2 border transition-all duration-300 ${
          safeIsDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <a
            href="/dashboard"
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-300 ${
              safeIsDarkMode 
                ? 'text-gray-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' 
                : 'text-gray-700 hover:text-gray-900 hover:drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            Dashboard
          </a>
          <a
            href="/browse"
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-300 ${
              safeIsDarkMode 
                ? 'text-gray-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' 
                : 'text-gray-700 hover:text-gray-900 hover:drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            Browse
          </a>
          <a
            href="/tradinghub"
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-300 whitespace-nowrap ${
              safeIsDarkMode 
                ? 'text-gray-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' 
                : 'text-gray-700 hover:text-gray-900 hover:drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            Trading Hub
          </a>
          <a
            href="/creator-dashboard"
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-300 ${
              safeIsDarkMode 
                ? 'text-gray-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' 
                : 'text-gray-700 hover:text-gray-900 hover:drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            Creator
          </a>
          <a
            href="/deploy"
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-300 ${
              safeIsDarkMode 
                ? 'text-gray-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' 
                : 'text-gray-700 hover:text-gray-900 hover:drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            Deploy Token
          </a>
        </nav>

        {/* Theme Toggle and RainbowKit Connect Button - Right Side */}
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
          <ThemeToggle />
          <ClientOnly
            fallback={
              <div className="h-8 w-8 sm:h-9 sm:w-auto sm:px-4 md:px-6 rounded-full text-white font-semibold text-xs sm:text-sm shadow-lg border border-pink-400/20 flex items-center justify-center" style={{ backgroundColor: '#651bcf' }}>
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="sm:hidden">+</span>
              </div>
            }
          >
            <ConnectButton 
              showBalance={false}
              chainStatus="icon"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </ClientOnly>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`lg:hidden border-t ${getBorderColor()} transition-all duration-500 ease-in-out backdrop-blur-md`} style={{backgroundColor: getHeaderBackground()}}>
        <div className={`w-full px-4 sm:px-6 py-3 rounded-2xl border transition-all duration-300 ${
          safeIsDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <nav className="flex items-center justify-center space-x-4">
            <a
              href="/dashboard"
              className={`text-sm font-medium transition-colors duration-500 ${
                safeIsDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Dashboard
            </a>
            <a
              href="/browse"
              className={`text-sm font-medium transition-colors duration-500 ${
                safeIsDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Browse
            </a>
            <a
              href="/tradinghub"
              className={`text-sm font-medium transition-colors duration-500 whitespace-nowrap ${
                safeIsDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Trading Hub
            </a>
            <a
              href="/creator-dashboard"
              className={`text-sm font-medium transition-colors duration-500 ${
                safeIsDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Creator
            </a>
            <a
              href="/deploy"
              className={`text-sm font-medium transition-colors duration-500 ${
                safeIsDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Deploy
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
