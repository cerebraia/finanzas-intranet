import { useNavigate } from 'react-router-dom'
import { Calendar, ArrowRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { maskAmount } from '@/lib/privacy'
import type { PendingItem } from '@/types/api'

interface Props {
  pendingItems: PendingItem[]
  privacyMode:  boolean
}

interface DayGroup {
  date:    string
  label:   string
  items:   PendingItem[]
  total:   number
}

const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatDayLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${Number(d)} ${MONTH_SHORT[Number(m)-1].toUpperCase()}`
}

export function Next7DaysWidget({ pendingItems, privacyMode }: Props) {
  const navigate  = useNavigate()

  const today  = new Date(); today.setHours(0,0,0,0)
  const in7    = new Date(today); in7.setDate(in7.getDate() + 7)
  const todayS = today.toISOString().slice(0,10)
  const in7S   = in7.toISOString().slice(0,10)

  const filtered = pendingItems.filter(i => {
    if (!i.dueDate) return false
    const d = i.dueDate
    return d >= todayS && d <= in7S
  })

  // Group by date
  const byDate = new Map<string, PendingItem[]>()
  for (const item of filtered) {
    const d = item.dueDate!
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(item)
  }

  const days: DayGroup[] = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, items]) => ({
      date,
      label: formatDayLabel(date),
      items,
      total: items.filter(i => (i as { direction?: string }).direction !== 'INCOMING')
                  .reduce((s, i) => s + i.pendingAmount, 0),
    }))

  const totalUSD = filtered
    .filter(i => (i as { direction?: string }).direction !== 'INCOMING')
    .reduce((s, i) => s + i.pendingAmount, 0)

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-brand-400" />
          <p className="text-sm font-bold text-content-primary">Próximos 7 días</p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={() => navigate('/pending')}
            className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 transition-colors font-medium"
          >
            Ver todos
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-content-muted text-center py-4">
          Sin pagos programados en los próximos 7 días
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {days.map(day => (
              <div key={day.date}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-content-muted tracking-wider">{day.label}</span>
                  <div className="flex-1 h-px bg-base-border" />
                </div>
                {day.items.map(item => {
                  const isIncoming = (item as { direction?: string }).direction === 'INCOMING'
                  return (
                    <div key={item.id} className="flex items-center gap-2 py-1 pl-2">
                      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isIncoming ? 'bg-emerald-400' : 'bg-red-400/70')} />
                      <p className="flex-1 text-xs text-content-secondary truncate">{item.title}</p>
                      <p className={cn('text-xs font-semibold tabular-nums', isIncoming ? 'text-emerald-400' : 'text-content-muted')}>
                        {maskAmount(formatCurrency(item.pendingAmount), privacyMode)}
                      </p>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Total */}
          {totalUSD > 0 && (
            <div className="mt-3 pt-3 border-t border-base-border flex items-center justify-between">
              <p className="text-xs font-semibold text-content-muted">Total compromisos</p>
              <p className="text-sm font-bold text-content-primary">
                {maskAmount(formatCurrency(totalUSD), privacyMode)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
