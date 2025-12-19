"use client"

import { Button } from "@/components/ui/button"
import { useSafeAccount } from "@/hooks/use-safe-wagmi"
import { useTheme } from "@/components/theme-provider"

export default function BidBopHero() {
  const { address, isConnected, mounted } = useSafeAccount()
  const { isDarkMode, mounted: themeMounted } = useTheme()
  const connected = isConnected
  const safeIsDarkMode = themeMounted ? isDarkMode : false

  const scrollToDeploy = () => {
    const deploySection = document.getElementById("deploy")
    if (deploySection) {
      deploySection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className={`relative min-h-screen flex items-center justify-center overflow-hidden transition-colors duration-300 ${safeIsDarkMode ? 'bg-gray-900' : 'bg-white'}`}>

      <div className="relative z-10 container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-16">
          <div className="text-center lg:text-left">
            <h1 className="text-balance text-7xl md:text-9xl font-bold leading-[0.9] tracking-tight mt-16 md:mt-12">
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent drop-shadow-2xl animate-pulse">
                  UpFloor
                </span>
                {/* Glowing effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent blur-sm opacity-75 animate-pulse">
                  UpFloor
                </span>
                {/* Shimmer effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent bg-clip-text text-transparent animate-pulse" style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s ease-in-out infinite'
                }}>
                  UpFloor
                </span>
              </span>
              <span className={`block text-3xl md:text-5xl mt-4 font-light bg-clip-text text-transparent drop-shadow-md transition-colors duration-300 ${safeIsDarkMode
                  ? 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300'
                  : 'bg-gradient-to-r from-gray-600 via-gray-700 to-gray-600'
                }`}>
                Something is Up ⚡
              </span>
            </h1>

            <p className={`mt-8 text-lg md:text-xl leading-relaxed max-w-prose mx-auto lg:mx-0 font-light drop-shadow-sm transition-colors duration-300 ${safeIsDarkMode ? 'text-purple-200' : 'text-purple-800'
              }`}>
              UpFloor is a protocol that transforms NFT collections into perpetual growth engines.
              It automatically acquires floor NFTs, relists them strategically, and loops profits back into the system - strengthening floors, reducing token supply, and rewarding holders with sustainable yield.
            </p>

            {/* Mascot Image - Between Paragraph and Buttons (Mobile/Tablet Only) */}
            <div className="flex justify-center my-8 lg:hidden">
              <div className="relative group">
                {/* Multi-layered Magical Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-400/40 to-purple-500/40 rounded-3xl blur-3xl group-hover:blur-4xl transition-all duration-1000 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-pink-300/30 to-purple-400/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-blue-400/20 to-pink-400/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>

                {/* Animated Floating Elements */}
                <div className="absolute -top-6 -right-6 w-10 h-10 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full opacity-70 energy-pulse shadow-lg"></div>
                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gradient-to-r from-purple-400 to-purple-300 rounded-full opacity-60 energy-pulse shadow-lg" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute top-1/2 -left-8 w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-300 rounded-full opacity-50 energy-pulse shadow-lg" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/4 -right-8 w-4 h-4 bg-gradient-to-r from-pink-300 to-pink-200 rounded-full opacity-40 energy-pulse shadow-lg" style={{ animationDelay: '1.5s' }}></div>
                <div className="absolute top-3/4 -right-12 w-5 h-5 bg-gradient-to-r from-purple-300 to-blue-300 rounded-full opacity-45 energy-pulse shadow-lg" style={{ animationDelay: '2s' }}></div>

                {/* Energy Streaks Effect */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-pink-400/30 to-transparent animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-transparent via-purple-400/30 to-transparent animate-pulse" style={{ animationDelay: '0.8s' }}></div>
                  <div className="absolute top-0 left-2/3 w-1 h-full bg-gradient-to-b from-transparent via-blue-400/30 to-transparent animate-pulse" style={{ animationDelay: '1.4s' }}></div>
                </div>

                {/* Main Showcase Card */}
                <div className={`relative backdrop-blur-2xl rounded-3xl p-6 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-1 ${safeIsDarkMode
                    ? 'bg-gray-800/30'
                    : 'bg-white/30'
                  }`}>
                  {/* Mascot Image with Enhanced Effects */}
                  <div className="relative">
                    {/* Image Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-400/20 to-purple-500/20 rounded-2xl blur-xl"></div>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/mascot.png"
                      alt="UpFloor cosmic mascot - purple alien astronaut"
                      className="relative h-72 w-72 md:h-96 md:w-96 rounded-2xl object-contain cosmic-float cosmic-glow group-hover:scale-110 transition-all duration-700"
                    />

                    {/* Floating Particles */}
                    <div className="absolute top-4 right-4 w-2 h-2 bg-pink-400 rounded-full particle-float"></div>
                    <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-purple-400 rounded-full particle-float" style={{ animationDelay: '0.3s' }}></div>
                    <div className="absolute top-1/2 right-2 w-1 h-1 bg-blue-400 rounded-full particle-float" style={{ animationDelay: '0.6s' }}></div>
                    <div className="absolute top-1/4 left-4 w-1.5 h-1.5 bg-pink-300 rounded-full particle-float" style={{ animationDelay: '1.2s' }}></div>
                    <div className="absolute bottom-1/4 right-6 w-1 h-1 bg-purple-300 rounded-full particle-float" style={{ animationDelay: '0.9s' }}></div>
                  </div>

                  {/* Cosmic Energy Ring - Removed borders to prevent white lines */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-400/10 via-purple-500/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
              <Button
                className="text-white h-14 px-10 rounded-full font-medium text-lg shadow-2xl hover:shadow-pink-500/25 transition-all duration-500 border border-pink-400/20 hover:scale-105"
                style={{ backgroundColor: '#651bcf' }}
                onClick={() => window.location.href = '/deploy'}
              >
                Activate Strategy
              </Button>
              <Button
                variant="outline"
                className={`h-14 px-10 rounded-full backdrop-blur-sm font-medium text-lg transition-all duration-500 hover:scale-105 ${safeIsDarkMode
                    ? 'border border-purple-400/40 bg-gray-800/20 text-purple-200 hover:bg-gray-700/30'
                    : 'border border-purple-300/40 bg-white/20 text-purple-800 hover:bg-white/30'
                  }`}
                onClick={() => window.open('https://introducing-upfloor-bydoonlabs.notion.site/UPFLOOR-2921352cbae2805c80a5e97197ec14a7', '_blank')}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Right Column - Mascot (Desktop Only) */}
          <div className="hidden lg:flex justify-center lg:justify-end relative">
            {/* Epic Mascot Showcase */}
            <div className="relative group">
              {/* Multi-layered Magical Glow Effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400/40 to-purple-500/40 rounded-3xl blur-3xl group-hover:blur-4xl transition-all duration-1000 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-pink-300/30 to-purple-400/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-blue-400/20 to-pink-400/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>

              {/* Animated Floating Elements */}
              <div className="absolute -top-6 -right-6 w-10 h-10 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full opacity-70 energy-pulse shadow-lg"></div>
              <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gradient-to-r from-purple-400 to-purple-300 rounded-full opacity-60 energy-pulse shadow-lg" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute top-1/2 -left-8 w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-300 rounded-full opacity-50 energy-pulse shadow-lg" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/4 -right-8 w-4 h-4 bg-gradient-to-r from-pink-300 to-pink-200 rounded-full opacity-40 energy-pulse shadow-lg" style={{ animationDelay: '1.5s' }}></div>
              <div className="absolute top-3/4 -right-12 w-5 h-5 bg-gradient-to-r from-purple-300 to-blue-300 rounded-full opacity-45 energy-pulse shadow-lg" style={{ animationDelay: '2s' }}></div>

              {/* Energy Streaks Effect */}
              <div className="absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-pink-400/30 to-transparent animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-transparent via-purple-400/30 to-transparent animate-pulse" style={{ animationDelay: '0.8s' }}></div>
                <div className="absolute top-0 left-2/3 w-1 h-full bg-gradient-to-b from-transparent via-blue-400/30 to-transparent animate-pulse" style={{ animationDelay: '1.4s' }}></div>
              </div>

              {/* Main Showcase Card */}
              <div className={`relative backdrop-blur-2xl rounded-3xl p-6 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-1 ${safeIsDarkMode
                  ? 'bg-gray-800/30'
                  : 'bg-white/30'
                }`}>
                {/* Mascot Image with Enhanced Effects */}
                <div className="relative">
                  {/* Image Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-400/20 to-purple-500/20 rounded-2xl blur-xl"></div>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/mascot.png"
                    alt="UpFloor cosmic mascot - purple alien astronaut"
                    className="relative h-72 w-72 md:h-96 md:w-96 rounded-2xl object-contain cosmic-float cosmic-glow group-hover:scale-110 transition-all duration-700"
                  />

                  {/* Floating Particles */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-pink-400 rounded-full particle-float"></div>
                  <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-purple-400 rounded-full particle-float" style={{ animationDelay: '0.3s' }}></div>
                  <div className="absolute top-1/2 right-2 w-1 h-1 bg-blue-400 rounded-full particle-float" style={{ animationDelay: '0.6s' }}></div>
                  <div className="absolute top-1/4 left-4 w-1.5 h-1.5 bg-pink-300 rounded-full particle-float" style={{ animationDelay: '1.2s' }}></div>
                  <div className="absolute bottom-1/4 right-6 w-1 h-1 bg-purple-300 rounded-full particle-float" style={{ animationDelay: '0.9s' }}></div>
                </div>

                {/* Cosmic Energy Ring - Removed borders to prevent white lines */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-400/10 via-purple-500/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>

              {/* Outer Energy Ring - Removed to prevent white border issues */}
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}