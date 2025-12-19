"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDarkMode: boolean
  mounted: boolean
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
  isDarkMode: false,
  mounted: false,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "bidbop-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light") // Always start with light to ensure SSR consistency
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get theme from localStorage or use default
    const storedTheme = localStorage.getItem(storageKey) as Theme
    if (storedTheme && (storedTheme === "dark" || storedTheme === "light")) {
      setTheme(storedTheme)
    } else {
      setTheme(defaultTheme)
    }
  }, [storageKey, defaultTheme])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement

    root.classList.remove("light", "dark")
    root.classList.add(theme)
    setIsDarkMode(theme === "dark")
  }, [theme, mounted])

  const value = {
    theme: mounted ? theme : "light", // Always return light theme until mounted
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    isDarkMode: mounted ? isDarkMode : false,
    mounted,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}