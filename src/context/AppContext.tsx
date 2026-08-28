import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { STORAGE_KEYS } from '@/lib/storage'

interface AppState {
  focusMode:     boolean
  toggleFocus:   () => void
  privacyMode:   boolean
  togglePrivacy: () => void
  commandOpen:   boolean
  openCommand:   () => void
  closeCommand:  () => void
  notifCount:    number
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [focusMode,   setFocusMode]   = useState(() => localStorage.getItem(STORAGE_KEYS.focusMode)   === 'true')
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem(STORAGE_KEYS.privacyMode) === 'true')
  const [commandOpen, setCommandOpen] = useState(false)

  const toggleFocus   = useCallback(() => setFocusMode(v   => { const n = !v; localStorage.setItem(STORAGE_KEYS.focusMode,   String(n)); return n }), [])
  const togglePrivacy = useCallback(() => setPrivacyMode(v => { const n = !v; localStorage.setItem(STORAGE_KEYS.privacyMode, String(n)); return n }), [])
  const openCommand  = useCallback(() => setCommandOpen(true),  [])
  const closeCommand = useCallback(() => setCommandOpen(false), [])

  // Global CTRL+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(v => !v)
      }
      if (e.key === 'Escape') setCommandOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <AppContext.Provider value={{ focusMode, toggleFocus, privacyMode, togglePrivacy, commandOpen, openCommand, closeCommand, notifCount: 5 }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
