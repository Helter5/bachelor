import { useState, useCallback, useEffect } from 'react'

const DARK_MODE_KEY = 'darkMode'

export function useDarkMode() {
  // Initialize from localStorage or default to true (dark mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DARK_MODE_KEY)
      return stored ? JSON.parse(stored) : true
    }
    return true
  })

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDarkMode))
  }, [isDarkMode])

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev)
  }, [])

  return { isDarkMode, toggleDarkMode }
}