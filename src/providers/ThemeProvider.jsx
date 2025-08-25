import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  toggleTheme: () => {},
})

const THEME_KEY = 'theme'

function getSystemPreference() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeClass(theme) {
  const root = document.documentElement
  const resolved = theme === 'system' ? getSystemPreference() : theme
  root.classList.toggle('dark', resolved === 'dark')
}

export function ThemeProvider({ defaultTheme = 'system', children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme
    return localStorage.getItem(THEME_KEY) || defaultTheme
  })

  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyThemeClass('system')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((value) => {
    setThemeState(value)
    try {
      localStorage.setItem(THEME_KEY, value)
    } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    const current = theme === 'system' ? getSystemPreference() : theme
    const next = current === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }, [theme, setTheme])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
