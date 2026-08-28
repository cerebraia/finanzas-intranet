import { useNavigate } from 'react-router-dom'
import {
  PlusCircle,
  TrendingDown,
  TrendingUp,
  UserPlus,
  CheckSquare,
  ArrowLeftRight,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const actions = [
  { label: 'Agregar gasto',     icon: TrendingDown,    path: '/expenses',  color: 'text-red-400' },
  { label: 'Agregar ingreso',   icon: TrendingUp,      path: '/income',    color: 'text-emerald-400' },
  { label: 'Nuevo cliente',     icon: UserPlus,        path: '/clients',   color: 'text-blue-400' },
  { label: 'Pagar compromiso',  icon: CheckSquare,     path: '/pending',   color: 'text-amber-400' },
  { label: 'Transferencia',     icon: ArrowLeftRight,  path: '/movements', color: 'text-brand-400' },
  { label: 'Ver reportes',      icon: BarChart3,       path: '/reports',   color: 'text-content-secondary' },
]

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <PlusCircle className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-content-primary">Accesos rápidos</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={cn(
                'flex flex-col items-center gap-2 px-3 py-3 rounded-lg border border-base-border',
                'bg-base-elevated hover:bg-base-hover hover:border-brand-600/40',
                'transition-all duration-150 text-center group',
              )}
            >
              <Icon className={cn('w-4.5 h-4.5 transition-transform group-hover:scale-110', action.color)} />
              <span className="text-[11px] font-medium text-content-muted group-hover:text-content-secondary leading-tight">
                {action.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
