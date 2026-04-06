import { createContext, useContext, useEffect, useState } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'theme-preference'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize theme from IndexedDB and system preference
  useEffect(() => {
    const loadTheme = async () => {
      const stored = await getItem<Theme>(STORES.SETTINGS, THEME_STORAGE_KEY)
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored)
      }

      // Set initial resolved theme - check if window exists (client-side)
      if (typeof window !== 'undefined') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        setResolvedTheme(
          stored === 'system' || !stored ? systemTheme : (stored as 'light' | 'dark')
        )
      } else {
        // Default to light theme on server-side
        setResolvedTheme(stored === 'system' || !stored ? 'light' : (stored as 'light' | 'dark'))
      }
      setIsInitialized(true)
    }

    loadTheme()
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setResolvedTheme(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Update document class and resolved theme when theme changes
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return

    const root = document.documentElement

    let newResolvedTheme: 'light' | 'dark'

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      newResolvedTheme = systemTheme
    } else {
      newResolvedTheme = theme
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolvedTheme(newResolvedTheme)

    // Update DOM
    root.classList.remove('light', 'dark')
    root.classList.add(newResolvedTheme)
  }, [theme, isInitialized])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    setItem(STORES.SETTINGS, THEME_STORAGE_KEY, newTheme).catch((error) => {
      console.error('Failed to save theme to IndexedDB:', error)
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
