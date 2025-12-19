"use client"

import { BookOpen, ExternalLink, Zap } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"

export default function BidBopFooter() {
  const { isDarkMode } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Prevent hydration mismatch by using default values until mounted
  const safeIsDarkMode = mounted ? isDarkMode : false

  return (
    <footer className="bg-background border-t border-border/40">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <a href="/" className="flex items-center space-x-3 mb-4 citrus-hover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={safeIsDarkMode ? "/brand/darkmode.png" : "/brand/logotest.png"} 
                alt="BidBop logo" 
                className="h-10 w-auto" 
              />
            </a>
            <p className="text-muted-foreground mb-6 max-w-md">
              Upfloor is a protocol that transforms NFT collections into perpetual growth engines.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://twitter.com/upfloorco"
                target="_blank"
                rel="noopener noreferrer"
                className="citrus-hover p-2 rounded-lg bg-secondary border border-border/50"
                aria-label="Twitter"
              >
                <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 12 7.5v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
              </a>
              <a
                href="mailto:customer-support@fb7310f9-1b22-42e8-aa84-db40accca152.mail.conversations.godaddy.com"
                className="citrus-hover p-2 rounded-lg bg-secondary border border-border/50"
                aria-label="Email"
              >
                <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h16a2 2 0 0 1 2 2v1l-10 6L2 7V6a2 2 0 0 1 2-2Zm18 6.2-10 6.1L2 10.2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-right">
            <h4 className="font-semibold mb-4 flex items-center justify-end space-x-2">
              <span>Quick Links</span>
              <Zap className="h-4 w-4 text-brand-lemon" />
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/browse"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors citrus-hover"
                >
                  Browse Collections
                </a>
              </li>
              <li>
                <a
                  href="/tradinghub"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors citrus-hover"
                >
                  Trading Hub
                </a>
              </li>
              <li>
                <a
                  href="#deploy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors citrus-hover"
                >
                  Deploy Token
                </a>
              </li>
              <li>
                <a
                  href="#analytics"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors citrus-hover"
                >
                  Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="text-right">
            <h4 className="font-semibold mb-4 flex items-center justify-end space-x-2">
              <span>Resources</span>
              <BookOpen className="h-4 w-4 text-brand-lime" />
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors citrus-hover flex items-center justify-end space-x-1"
                >
                  <span>Discord</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors citrus-hover flex items-center justify-end space-x-1"
                >
                  <span>Blog</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/upfloorco"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors citrus-hover flex items-center justify-end space-x-1"
                >
                  <span>Twitter</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors citrus-hover flex items-center justify-end space-x-1"
                >
                  <span>Telegram</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-border/40">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-muted-foreground">
              <span>© 2025 UpFloor by DoonLabs. </span><span>  All rights reserved.</span>
              <div className="flex items-center space-x-4">
                <a href="#privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
                <span>•</span>
                <a href="#terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Built for curious Ampharion explorers.</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
