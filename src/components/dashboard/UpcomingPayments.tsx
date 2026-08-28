import { Clock } from 'lucide-react'
import type { UpcomingPayment } from '@/types'
import { cn } from '@/lib/utils'

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatDue(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2,'0')} ${MONTH_SHORT[d.getMonth()]}`
}

function getDueBadge(dateStr: string): { label: string; cls: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000)

  if (diff < 0)  return { label: 'Vencido',  cls: 'bg-red-500/10 text-red-400 border-red-500/20' }
  if (diff === 0) return { label: 'Hoy',      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
  if (diff <= 5)  return { label: `${diff}d`, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
  return { label: formatDue(dateStr), cls: 'bg-base-elevated text-content-muted border-base-border' }
}

interface UpcomingPaymentsProps {
  payments: UpcomingPayment[]
}

export function UpcomingPayments({ payments }: UpcomingPaymentsProps) {
  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-content-primary">Pendientes próximos</h3>
        </div>
        <span className="text-xs text-content-muted">{payments.length} items</span>
      </div>

      <ul className="space-y-1.5">
        {payments.map((p) => {
          const badge = getDueBadge(p.dueDate)
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 py-1.5 group"
            >
              {/* Checkbox visual */}
              <div
                className={cn(
                  'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                  p.paid
                    ? 'bg-emerald-500/20 border-emerald-500/40'
                    : 'border-base-border group-hover:border-brand-600/50',
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content-primary truncate leading-none">{p.name}</p>
                <p className="text-xs text-content-muted mt-0.5">{p.category}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-semibold text-content-primary tabular-nums">
                  ${p.amount}
                </span>
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', badge.cls)}>
                  {badge.label}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="pt-3 border-t border-base-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">Total comprometido</span>
        <span className="text-base font-bold text-red-400 tabular-nums">
          ${total.toLocaleString('es-VE', { minimumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  )
}
