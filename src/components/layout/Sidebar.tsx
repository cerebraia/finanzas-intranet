import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, X, LogOut, User } from 'lucide-react'
import { NAV_GROUPS }     from '@/constants/navigation'
import { useAuth }        from '@/context/AuthContext'
import { UserAvatar }     from '@/components/ui/UserAvatar'
import { cn }             from '@/lib/utils'
import type { UserRole }  from '@/types/auth'
import { ROLE_NAV_GROUPS } from '@/types/auth'

interface SidebarProps {
  collapsed:     boolean
  onToggle:      () => void
  mobileOpen:    boolean
  onCloseMobile: () => void
  toggleSection: (title: string) => void
  isSectionOpen: (title: string) => boolean
}

const ROLE_BADGE: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-500/25 text-red-300',
  ADMIN:       'bg-white/15 text-white',
  MANAGER:     'bg-amber-500/25 text-amber-300',
  EMPLOYEE:    'bg-emerald-500/25 text-emerald-300',
  VIEWER:      'bg-white/10 text-white/50',
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

      {/* ── Logo ───────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b flex-shrink-0',
        'border-[#192E54]',
        collapsed ? 'justify-center px-0' : 'justify-between'
      )}>
        {collapsed ? (
          <div className="w-8 h-8 flex items-center justify-center">
            <img
              src="/logo-myd3000.svg"
              alt="MYD3000"
              className="h-6 w-auto object-contain object-left"
              draggable={false}
            />
          </div>
        ) : (
          <img
            src="/logo-myd3000.svg"
            alt="MYD3000"
            className="h-7 w-auto object-contain object-left"
            draggable={false}
          />
        )}

        {/* Cierre mobile */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-auto"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Usuario ───────────────────────────────────────── */}
      {user && !collapsed && (
        <div
          className="mx-3 my-2.5 p-2.5 rounded-lg bg-white/8 border border-white/10 cursor-pointer hover:bg-white/12 transition-colors"
          onClick={() => { navigate('/perfil'); onCloseMobile() }}
        >
          <div className="flex items-center gap-2.5">
            <UserAvatar
              firstName={user.firstName}
              lastName={user.lastName}
              avatarUrl={user.avatarUrl}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', ROLE_BADGE[user.role])}>
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          </div>
        </div>
      )}
      {user && collapsed && (
        <div className="flex justify-center my-2.5">
          <UserAvatar
            firstName={user.firstName}
            lastName={user.lastName}
            avatarUrl={user.avatarUrl}
            size="sm"
            onClick={() => navigate('/perfil')}
          />
        </div>
      )}

      {/* ── Navegación ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5">
        {filteredGroups.map((group, gi) => {
          const isOpen = group.title ? isSectionOpen(group.title) : true

          return (
            <div key={gi}>
              {group.title ? (
                collapsed ? (
                  <div className="mx-auto w-5 h-px bg-white/10 my-2" />
                ) : (
                  <button
                    onClick={() => toggleSection(group.title!)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-widest text-white/35 hover:text-white/55 hover:bg-white/5 transition-colors select-none"
                  >
                    <span>{group.title}</span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', isOpen ? 'rotate-0' : '-rotate-90')} />
                  </button>
                )
              ) : null}

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
                            'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium',
                            'transition-colors duration-100 select-none',
                            isActive
                              ? 'bg-white/18 text-white'
                              : 'text-white/55 hover:text-white hover:bg-white/8',
                            collapsed && 'justify-center px-0'
                          )}
                        >
                          <item.icon className={cn(
                            'w-4 h-4 flex-shrink-0 transition-colors',
                            isActive ? 'text-white' : 'text-white/45 group-hover:text-white/80'
                          )} />
                          {!collapsed && (
                            <span className="animate-fade-in truncate">{item.label}</span>
                          )}
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

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="flex-shrink-0 px-2 pb-3 pt-2 border-t border-[#192E54] space-y-0.5">
        {!collapsed && (
          <NavLink
            to="/perfil"
            onClick={onCloseMobile}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors',
              isActive ? 'bg-white/18 text-white' : 'text-white/55 hover:text-white hover:bg-white/8'
            )}
          >
            <User className="w-4 h-4 flex-shrink-0" />
            <span>Mi perfil</span>
          </NavLink>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium',
            'text-white/40 hover:text-red-300 hover:bg-red-500/15 transition-colors duration-100',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>

        <button
          onClick={onToggle}
          className={cn(
            'hidden md:flex w-full items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium',
            'text-white/25 hover:text-white/50 hover:bg-white/6 transition-colors duration-100',
            collapsed && 'justify-center'
          )}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <><ChevronLeft className="w-3.5 h-3.5" /><span>Colapsar</span></>
          }
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'hidden md:flex flex-col flex-shrink-0 sidebar-transition overflow-hidden',
          collapsed ? 'w-14' : 'w-56'
        )}
        style={{ backgroundColor: 'var(--myd-navy)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside
            className="relative z-50 flex flex-col w-60 h-full animate-slide-in"
            style={{ backgroundColor: 'var(--myd-navy)' }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
