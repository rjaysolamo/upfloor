"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme, isDarkMode } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const cycleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  const getIcon = () => {
    return isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
  }

  const getLabel = () => {
    return isDarkMode ? "Light" : "Dark"
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cycleTheme}
      className={`h-8 w-8 sm:h-9 sm:w-auto sm:px-3 transition-all duration-300 hover:scale-105 ${
        isDarkMode 
          ? 'border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-400 hover:text-white' 
          : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
      }`}
      title={`Current: ${getLabel()} mode`}
    >
      {getIcon()}
      <span className="ml-2 hidden sm:inline">{getLabel()}</span>
    </Button>
  )
}
