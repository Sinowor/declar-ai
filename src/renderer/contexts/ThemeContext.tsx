import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getThemeById, defaultThemeId, STORAGE_KEY, type ThemeColor } from '../../shared/theme-colors'

export type ThemeMode = 'light' | 'dark' | 'system'
const MODE_STORAGE_KEY = 'declarai-theme-mode'

interface ThemeContextValue {
  theme: ThemeColor
  setThemeId: (id: string) => void
  themeId: string
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
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
  root.style.setProperty('--gradient-rgb', theme.gradientRgb)
}

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function applyMode(resolved: 'light' | 'dark') {
  if (resolved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || defaultThemeId
  })
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode) || 'light'
  })

  const theme = getThemeById(themeId)

  // Apply color theme
  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, themeId)
  }, [theme, themeId])

  // Apply dark/light mode
  useEffect(() => {
    const resolved = resolveMode(themeMode)
    applyMode(resolved)
    localStorage.setItem(MODE_STORAGE_KEY, themeMode)
  }, [themeMode])

  // Listen for system preference changes
  useEffect(() => {
    if (themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => applyMode(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themeMode])

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, themeId, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
