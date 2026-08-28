import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, TrendingDown, TrendingUp, DollarSign, ShoppingCart, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { label: 'Agregar gasto',    icon: TrendingDown,  path: '/expenses',     color: 'bg-red-500/90 hover:bg-red-500' },
  { label: 'Agregar ingreso',  icon: TrendingUp,    path: '/income',       color: 'bg-emerald-500/90 hover:bg-emerald-500' },
  { label: 'Registrar pago',   icon: DollarSign,    path: '/payroll',      color: 'bg-brand-600/90 hover:bg-brand-600' },
  { label: 'Nueva compra',     icon: ShoppingCart,  path: '/por-comprar',  color: 'bg-purple-500/90 hover:bg-purple-500' },
  { label: 'Nuevo recordatorio', icon: Bell,        path: '/recordatorios',color: 'bg-blue-500/90 hover:bg-blue-500' },
]

export function FabMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  function handleSelect(path: string) {
    navigate(path)
    setOpen(false)
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2">
      {/* Sub-items */}
      <div className={cn(
        'flex flex-col items-end gap-2 transition-all duration-200 origin-bottom',
        open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      )}>
        {[...ITEMS].reverse().map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-xs font-medium text-content-secondary bg-base-surface border border-base-border rounded-lg px-2.5 py-1 shadow-sm whitespace-nowrap">
              {item.label}
            </span>
            <button
              onClick={() => handleSelect(item.path)}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-150',
                item.color
              )}
            >
              <item.icon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center text-white shadow-glow transition-all duration-200',
          open ? 'bg-base-surface border border-base-border' : 'bg-brand-600 hover:bg-brand-500'
        )}
      >
        {open
          ? <X className="w-5 h-5 text-content-primary" />
          : <Plus className="w-6 h-6" />
        }
      </button>

      {open && <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />}
    </div>
  )
}
