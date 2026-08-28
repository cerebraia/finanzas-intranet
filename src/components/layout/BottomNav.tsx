import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Clock, ArrowLeftRight, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Dashboard',  path: '/',          icon: LayoutDashboard },
  { label: 'Calendario', path: '/calendario', icon: CalendarDays },
  { label: 'Pendientes', path: '/pending',    icon: Clock },
  { label: 'Movimientos',path: '/movements',  icon: ArrowLeftRight },
  { label: 'Config',     path: '/settings',   icon: Settings },
]

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-base-surface border-t border-base-border flex items-center safe-area-bottom">
      {NAV_ITEMS.map(item => {
        const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-brand-400' : 'text-content-disabled hover:text-content-muted'
            )}
          >
            <item.icon className={cn('w-5 h-5', isActive ? 'text-brand-400' : 'text-content-disabled')} />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
