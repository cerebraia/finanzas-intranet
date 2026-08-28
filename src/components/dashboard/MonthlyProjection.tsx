import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectionData {
  available: number
  receivable: number
  committed: number
}

interface MonthlyProjectionProps {
  data: ProjectionData
}

export function MonthlyProjection({ data }: MonthlyProjectionProps) {
  const { available, receivable, committed } = data
  const projection = available + receivable - committed
  const isPositive = projection >= 0

  const rows = [
    {
      label: 'Disponible actual',
      value: available,
      prefix: '',
      color: 'text-content-primary',
    },
    {
      label: 'Pendiente por cobrar',
      value: receivable,
      prefix: '+',
      color: 'text-emerald-400',
    },
    {
      label: 'Compromisos restantes',
      value: committed,
      prefix: '-',
      color: 'text-red-400',
    },
  ]

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-content-primary">Proyección al cierre</h3>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2">
            <span className="text-sm text-content-muted">{row.label}</span>
            <span className={cn('text-sm font-semibold tabular-nums', row.color)}>
              {row.prefix}${row.value.toLocaleString('es-VE', { minimumFractionDigits: 0 })}
            </span>
          </div>
        ))}
      </div>

      <div
        className={cn(
          'pt-3 border-t border-base-border flex items-center justify-between',
          'rounded-b-lg',
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
          Proyección final
        </span>
        <span
          className={cn(
            'text-xl font-bold tabular-nums',
            isPositive ? 'text-emerald-400' : 'text-red-400',
          )}
        >
          {isPositive ? '' : '-'}${Math.abs(projection).toLocaleString('es-VE', { minimumFractionDigits: 0 })}
        </span>
      </div>

      <div
        className={cn(
          'rounded-lg px-3 py-2 text-xs font-medium text-center',
          isPositive
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400',
        )}
      >
        {isPositive
          ? `Cerrarás el mes con ${isPositive ? 'superávit' : 'déficit'} de $${Math.abs(projection).toLocaleString()}`
          : `Déficit proyectado de $${Math.abs(projection).toLocaleString()}`
        }
      </div>
    </div>
  )
}
