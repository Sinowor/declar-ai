import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getThemeById, defaultThemeId, STORAGE_KEY, type ThemeColor } from '../../shared/theme-colors'

interface ThemeContextValue {
  theme: ThemeColor
  setThemeId: (id: string) => void
  themeId: string
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: ThemeColor) {
  const root = document.documentElement
  root.style.setProperty('--primary', theme.primary)
  root.style.setProperty('--primary-rgb', theme.primaryRgb)
  root.style.setProperty('--primary-foreground', theme.primaryForeground)
  root.style.setProperty('--accent-foreground', theme.accentForeground)
  root.style.setProperty('--ring', theme.primary)
  root.style.setProperty('--gradient', theme.gradient)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || defaultThemeId
  })

  const theme = getThemeById(themeId)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, themeId)
  }, [theme, themeId])

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, themeId }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
