import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, Zap, X, LogOut, User } from 'lucide-react'
import { NAV_GROUPS } from '@/constants/navigation'
import { useAuth }    from '@/context/AuthContext'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/auth'
import { ROLE_NAV_GROUPS } from '@/types/auth'

interface SidebarProps {
  collapsed:       boolean
  onToggle:        () => void
  mobileOpen:      boolean
  onCloseMobile:   () => void
  toggleSection:   (title: string) => void
  isSectionOpen:   (title: string) => boolean
}

const ROLE_BADGE_CLS: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-500/20 text-red-400',
  ADMIN:       'bg-brand-600/20 text-brand-400',
  MANAGER:     'bg-amber-500/20 text-amber-400',
  EMPLOYEE:    'bg-emerald-500/20 text-emerald-400',
  VIEWER:      'bg-base-elevated text-content-disabled',
}
const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin',
  MANAGER: 'Manager', EMPLOYEE: 'Empleado', VIEWER: 'Viewer',
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile, toggleSection, isSectionOpen }: SidebarProps) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuth()

  const allowedPaths = user ? ROLE_NAV_GROUPS[user.role] : ['*']
  const isAllowed = (path: string) => {
    if (allowedPaths.includes('*')) return true
    return allowedPaths.some(p => path === p || (p !== '/' && path.startsWith(p)))
  }

  const filteredGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => isAllowed(item.path)),
  })).filter(group => group.items.length > 0)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-14 border-b border-base-border flex-shrink-0',
        collapsed && 'justify-center'
      )}>
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shadow-glow-sm">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="text-sm font-semibold text-content-primary leading-none">Finanzas</p>
            <p className="text-[10px] text-content-muted leading-none mt-0.5">Intranet</p>
          </div>
        )}
        <button onClick={onCloseMobile} className="ml-auto md:hidden p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User mini-profile */}
      {user && !collapsed && (
        <div
          className="mx-2 my-2 p-2.5 rounded-xl bg-base-elevated border border-base-border cursor-pointer hover:bg-base-hover transition-colors"
          onClick={() => { navigate('/perfil'); onCloseMobile() }}
        >
          <div className="flex items-center gap-2">
            <UserAvatar
              firstName={user.firstName}
              lastName={user.lastName}
              avatarUrl={user.avatarUrl}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-content-primary truncate">{user.firstName} {user.lastName}</p>
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', ROLE_BADGE_CLS[user.role])}>
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          </div>
        </div>
      )}
      {user && collapsed && (
        <div className="flex justify-center my-2">
          <UserAvatar
            firstName={user.firstName}
            lastName={user.lastName}
            avatarUrl={user.avatarUrl}
            size="sm"
            onClick={() => navigate('/perfil')}
          />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5">
        {filteredGroups.map((group, gi) => {
          const isOpen = group.title ? isSectionOpen(group.title) : true

          return (
            <div key={gi}>
              {/* Group header — clickable to toggle */}
              {group.title ? (
                collapsed ? (
                  // Collapsed: just show a subtle divider
                  <div className="mx-auto w-4 h-px bg-base-border my-2" />
                ) : (
                  <button
                    onClick={() => toggleSection(group.title!)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest text-content-disabled hover:text-content-muted hover:bg-base-hover transition-colors select-none group"
                  >
                    <span>{group.title}</span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', isOpen ? 'rotate-0' : '-rotate-90')} />
                  </button>
                )
              ) : null}

              {/* Items — animate open/close */}
              {(isOpen || collapsed || !group.title) && (
                <ul className="space-y-0.5 mt-0.5">
                  {group.items.map(item => {
                    const isActive = item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path)

                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          onClick={onCloseMobile}
                          title={item.label}
                          className={cn(
                            'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium',
                            'transition-all duration-150 select-none border',
                            isActive
                              ? 'bg-brand-600/15 text-brand-400 border-brand-600/25'
                              : 'text-content-muted hover:text-content-primary hover:bg-base-hover border-transparent',
                            collapsed && 'justify-center'
                          )}
                        >
                          <item.icon className={cn(
                            'w-4 h-4 flex-shrink-0 transition-colors',
                            isActive ? 'text-brand-400' : 'text-content-disabled group-hover:text-content-secondary'
                          )} />
                          {!collapsed && <span className="animate-fade-in truncate text-[13px]">{item.label}</span>}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 px-2 pb-3 pt-2 border-t border-base-border space-y-0.5">
        {!collapsed && (
          <NavLink to="/perfil" onClick={onCloseMobile}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all border',
              isActive
                ? 'bg-brand-600/15 text-brand-400 border-brand-600/25'
                : 'text-content-muted hover:text-content-primary hover:bg-base-hover border-transparent'
            )}>
            <User className="w-4 h-4 flex-shrink-0" />
            <span>Mi perfil</span>
          </NavLink>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium',
            'text-content-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all duration-150',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>

        <button
          onClick={onToggle}
          className={cn(
            'hidden md:flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium',
            'text-content-disabled hover:text-content-muted hover:bg-base-hover border border-transparent hover:border-base-border transition-all duration-150',
            collapsed && 'justify-center'
          )}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4" /><span>Colapsar</span></>
          }
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className={cn(
        'hidden md:flex flex-col flex-shrink-0 bg-base-surface border-r border-base-border sidebar-transition overflow-hidden',
        collapsed ? 'w-14' : 'w-56'
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="relative z-50 flex flex-col w-60 h-full bg-base-surface border-r border-base-border animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
