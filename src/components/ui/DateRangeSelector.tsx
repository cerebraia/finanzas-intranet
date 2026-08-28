import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { cn } from '@/lib/utils'

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export function DateRangeSelector() {
  const { dateRange, setDateRange } = useWorkspace()
  const { from, to } = dateRange

  const label = `${String(from.getDate()).padStart(2, '0')} ${MONTH_NAMES[from.getMonth()]} ${from.getFullYear()} — ${String(to.getDate()).padStart(2, '0')} ${MONTH_NAMES[to.getMonth()]} ${to.getFullYear()}`

  function shiftMonth(delta: number) {
    const next = new Date(from.getFullYear(), from.getMonth() + delta, 1)
    const nextTo = new Date(next.getFullYear(), next.getMonth() + 1, 0)
    setDateRange({ from: next, to: nextTo })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => shiftMonth(-1)}
        className={cn(
          'p-1.5 rounded-lg border border-base-border bg-base-elevated',
          'text-content-muted hover:text-content-primary hover:bg-base-hover',
          'transition-all duration-150',
        )}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <button
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-base-border',
          'bg-base-elevated text-xs font-medium text-content-secondary',
          'hover:border-brand-600/50 hover:text-content-primary hover:bg-base-hover',
          'transition-all duration-150 whitespace-nowrap',
        )}
      >
        <CalendarDays className="w-3.5 h-3.5 text-content-muted flex-shrink-0" />
        <span className="hidden sm:block">{label}</span>
        <span className="sm:hidden">{MONTH_NAMES[from.getMonth()]} {from.getFullYear()}</span>
      </button>

      <button
        onClick={() => shiftMonth(1)}
        className={cn(
          'p-1.5 rounded-lg border border-base-border bg-base-elevated',
          'text-content-muted hover:text-content-primary hover:bg-base-hover',
          'transition-all duration-150',
        )}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
