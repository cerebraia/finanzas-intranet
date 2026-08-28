import { TrendingUp, TrendingDown, ShoppingCart, Wallet, Info } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { maskAmount } from '@/lib/privacy'
import type { DashboardSummary } from '@/types/api'
import type { PurchaseItem } from '@/types/purchases'

interface Props {
  summary:      DashboardSummary
  purchases:    PurchaseItem[]
  privacyMode:  boolean
  currentMonth: string  // 'YYYY-MM'
}

interface PlanRow {
  label:     string
  value:     number
  type:      'income' | 'expense' | 'neutral' | 'total' | 'projection'
  icon:      React.ElementType
  note?:     string
}

function PlanLine({ label, value, type, icon: Icon, note, privacyMode }: PlanRow & { privacyMode: boolean }) {
  const colorCls = {
    income:     'text-emerald-400',
    expense:    'text-red-400',
    neutral:    'text-content-muted',
    total:      'text-content-primary',
    projection: 'text-brand-400',
  }[type]

  const prefix = type === 'expense' ? '-' : type === 'income' ? '+' : ''

  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', colorCls)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium', type === 'projection' ? 'text-brand-400 font-semibold' : 'text-content-secondary')}>
          {label}
        </p>
        {note && <p className="text-[10px] text-content-disabled">{note}</p>}
      </div>
      <p className={cn('text-sm font-semibold tabular-nums', colorCls)}>
        {prefix}{maskAmount(formatCurrency(Math.abs(value)), privacyMode)}
      </p>
    </div>
  )
}

export function MonthPlanWidget({ summary, purchases, privacyMode, currentMonth }: Props) {
  const plannedPurchases = purchases.filter(p =>
    (p.status === 'TODO' || p.status === 'PLANNED') &&
    p.plannedMonth === currentMonth &&
    p.estimatedAmount != null
  )
  const plannedTotal = plannedPurchases.reduce((s, p) => s + (p.estimatedAmount ?? 0), 0)

  const freeCash      = summary.available - summary.committed
  const afterPlans    = freeCash - plannedTotal

  const rows: PlanRow[] = [
    { label: 'Disponible actual',      value: summary.available,    type: 'income',   icon: Wallet },
    { label: 'Compromisos del mes',    value: summary.committed,    type: 'expense',  icon: TrendingDown, note: 'deudas, nómina, gastos fijos' },
    { label: 'Dinero libre estimado',  value: freeCash,             type: freeCash >= 0 ? 'total' : 'expense', icon: TrendingUp },
  ]

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-4">
      <div className="flex items-center gap-1.5 mb-4">
        <Info className="w-3.5 h-3.5 text-brand-400" />
        <p className="text-sm font-bold text-content-primary">Plan del mes</p>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 font-medium">
          PROYECCIÓN
        </span>
      </div>

      <div className="space-y-0.5">
        {rows.map((r, i) => (
          <PlanLine key={i} {...r} privacyMode={privacyMode} />
        ))}

        {/* Separator */}
        <div className="h-px bg-base-border my-2" />

        {/* Compras planificadas */}
        {plannedTotal > 0 && (
          <>
            <PlanLine
              label="Compras planificadas"
              value={plannedTotal}
              type="expense"
              icon={ShoppingCart}
              note={`${plannedPurchases.length} item${plannedPurchases.length !== 1 ? 's' : ''}`}
              privacyMode={privacyMode}
            />
            <PlanLine
              label="Disponible después de planes"
              value={afterPlans}
              type={afterPlans >= 0 ? 'projection' : 'expense'}
              icon={Wallet}
              privacyMode={privacyMode}
            />
          </>
        )}

        {plannedTotal === 0 && (
          <div className="flex items-center gap-2 py-1">
            <ShoppingCart className="w-3.5 h-3.5 text-content-disabled" />
            <p className="text-xs text-content-disabled italic">Sin compras planificadas este mes</p>
          </div>
        )}
      </div>

      {/* Reminder */}
      <p className="mt-3 text-[10px] text-content-disabled border-t border-base-border pt-2">
        Proyección basada en disponible actual y compromisos conocidos. No incluye ingresos futuros.
      </p>
    </div>
  )
}
