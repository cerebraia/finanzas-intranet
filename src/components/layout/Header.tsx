import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Bell, Search, Zap } from 'lucide-react'
import { NAV_GROUPS } from '@/constants/navigation'
import { WorkspaceSelector } from '@/components/ui/WorkspaceSelector'
import { DateRangeSelector } from '@/components/ui/DateRangeSelector'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { usePendingItems } from '@/hooks/usePendingItems'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onOpenMobile: () => void
}

function getBreadcrumb(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  if (pathname === '/calendario')     return 'Calendario'
  if (pathname === '/notificaciones') return 'Notificaciones'
  if (pathname.startsWith('/deudas')) return 'Deudas'
  if (pathname.startsWith('/equipo')) return 'Equipo'
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname.startsWith(item.path) && item.path !== '/') {
        return item.label
      }
    }
  }
  return ''
}

export function Header({ onOpenMobile }: HeaderProps) {
  const { pathname }    = useLocation()
  const navigate        = useNavigate()
  const { openCommand, toggleFocus, focusMode } = useApp()
  const { user } = useAuth()

  const { activeWorkspace } = useWorkspace()
  const { data: pendingItems = [] } = usePendingItems(activeWorkspace?.id ?? '', { limit: 50 })
  const title       = getBreadcrumb(pathname)
  const unreadCount = pendingItems.length

  return (
    <header className="flex items-center h-14 px-4 md:px-5 border-b border-base-border bg-base flex-shrink-0 gap-3">
      {/* Mobile menu */}
      <button
        onClick={onOpenMobile}
        className="md:hidden p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-content-disabled hidden sm:block">Intranet</span>
        {title && (
          <>
            <span className="text-content-disabled hidden sm:block">/</span>
            <span className="text-content-secondary font-medium truncate">{title}</span>
          </>
        )}
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* Date range — hidden on xs */}
        <div className="hidden md:flex">
          <DateRangeSelector />
        </div>

        {/* Workspace selector */}
        <WorkspaceSelector />

        {/* Search CTRL+K */}
        <button
          onClick={openCommand}
          className={cn(
            'hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-base-border',
            'bg-base-elevated text-xs font-medium text-content-muted',
            'hover:border-brand-600/40 hover:text-content-primary hover:bg-base-hover',
            'transition-all duration-150',
          )}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Buscar</span>
          <kbd className="text-[9px] px-1.5 py-0.5 rounded border border-base-border/60 text-content-disabled">⌘K</kbd>
        </button>

        {/* Focus mode toggle */}
        <button
          onClick={toggleFocus}
          title={focusMode ? 'Desactivar modo enfoque' : 'Activar modo enfoque'}
          className={cn(
            'hidden md:flex p-1.5 rounded-lg transition-colors',
            focusMode
              ? 'text-brand-400 bg-brand-600/15 border border-brand-600/30'
              : 'text-content-muted hover:text-content-primary hover:bg-base-hover'
          )}
        >
          <Zap className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notificaciones')}
          className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Avatar → perfil */}
        {user && (
          <UserAvatar
            firstName={user.firstName}
            lastName={user.lastName}
            avatarUrl={user.avatarUrl}
            size="sm"
            onClick={() => navigate('/perfil')}
            className="hover:opacity-80 transition-opacity select-none"
          />
        )}
      </div>
    </header>
  )
}
