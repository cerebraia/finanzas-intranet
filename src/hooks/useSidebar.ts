import { useState, useCallback, useEffect } from 'react'
import { STORAGE_KEYS } from '@/lib/storage'

const MOBILE_BREAKPOINT = 768

const DEFAULT_OPEN: Record<string, boolean> = {
  General:       true,
  Dinero:        true,
  Compromisos:   false,
  Negocios:      true,
  Organización:  true,
  Análisis:      false,
  Sistema:       false,
}

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.sidebarCollapsed)
    if (stored !== null) return stored === 'true'
    return window.innerWidth < MOBILE_BREAKPOINT
  })

  const [mobileOpen, setMobileOpen] = useState(false)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.sidebarSections)
      return stored ? { ...DEFAULT_OPEN, ...JSON.parse(stored) } : DEFAULT_OPEN
    } catch { return DEFAULT_OPEN }
  })

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(next))
      return next
    })
  }, [])

  const toggleSection = useCallback((title: string) => {
    setOpenSections(prev => {
      const next = { ...prev, [title]: !prev[title] }
      localStorage.setItem(STORAGE_KEYS.sidebarSections, JSON.stringify(next))
      return next
    })
  }, [])

  const isSectionOpen = useCallback((title: string): boolean => {
    return openSections[title] ?? true
  }, [openSections])

  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const openMobile  = useCallback(() => setMobileOpen(true),  [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return { collapsed, toggle, mobileOpen, openMobile, closeMobile, toggleSection, isSectionOpen }
}
