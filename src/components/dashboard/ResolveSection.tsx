import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, Calendar, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { maskAmount } from '@/lib/privacy'
import type { PendingItem } from '@/types/api'
import type { PurchaseItem, Reminder } from '@/types/purchases'

// ─── Unified resolve item ─────────────────────────────────────────────────────

export type ResolveItemSource = 'PENDING' | 'PURCHASE' | 'REMINDER'

export interface ResolveItem {
  id:         string
  source:     ResolveItemSource
  sourceType: string
  title:      string
  subtitle:   string
  amount:     number | null
  currency:   string
  dueDate:    string | null
  status:     string
  direction:  'INCOMING' | 'OUTGOING' | null
  path:       string
}

// ─── Normalization helpers ────────────────────────────────────────────────────

const SOURCE_PATHS: Record<string, string> = {
  RECEIVABLE:        '/receivables',
  PAYROLL:           '/payroll',
  RECURRING_EXPENSE: '/fixed-expenses',
  DEBT:              '/debts',
}

const SOURCE_LABELS: Record<string, string> = {
  RECEIVABLE:        'Por cobrar',
  PAYROLL:           'Nómina',
  RECURRING_EXPENSE: 'Gasto fijo',
  DEBT:              'Deuda',
}

export function normalizePendingItems(items: PendingItem[]): ResolveItem[] {
  return items.map(i => ({
    id:         i.id,
    source:     'PENDING',
    sourceType: i.sourceType,
    title:      i.title,
    subtitle:   SOURCE_LABELS[i.sourceType] ?? i.sourceType,
    amount:     i.pendingAmount,
    currency:   'USD',
    dueDate:    i.dueDate,
    status:     i.status,
    direction:  (i as { direction?: string }).direction as 'INCOMING' | 'OUTGOING' | null ?? null,
    path:       SOURCE_PATHS[i.sourceType] ?? '/pending',
  }))
}

export function normalizePurchases(items: PurchaseItem[]): ResolveItem[] {
  return items
    .filter(p => (p.status === 'TODO' || p.status === 'PLANNED') && (p.dueDate || p.priority === 'URGENT'))
    .map(p => ({
      id:         p.id,
      source:     'PURCHASE' as ResolveItemSource,
      sourceType: 'PURCHASE',
      title:      p.title,
      subtitle:   'Compra pendiente',
      amount:     p.estimatedAmount ?? null,
      currency:   p.currency,
      dueDate:    p.dueDate ?? null,
      status:     p.status,
      direction:  'OUTGOING' as const,
      path:       '/por-comprar',
    }))
}

export function normalizeReminders(items: Reminder[]): ResolveItem[] {
  const today = new Date().toISOString().slice(0, 10)
  return items
    .filter(r => r.status === 'PENDING' && (r.snoozedTo ?? r.reminderDate) <= today)
    .map(r => ({
      id:         r.id,
      source:     'REMINDER' as ResolveItemSource,
      sourceType: 'REMINDER',
      title:      r.title,
      subtitle:   'Recordatorio',
      amount:     null,
      currency:   'USD',
      dueDate:    r.reminderDate,
      status:     r.status,
      direction:  null,
      path:       '/recordatorios',
    }))
}

// ─── Time buckets ─────────────────────────────────────────────────────────────

type TimeBucket = 'OVERDUE' | 'TODAY' | 'NEXT_7' | 'THIS_MONTH'

function getBucket(item: ResolveItem): TimeBucket {
  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)
  const in7     = new Date(today); in7.setDate(in7.getDate() + 7)
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  if (item.status === 'OVERDUE') return 'OVERDUE'
  const d = item.dueDate
  if (!d) return 'THIS_MONTH'
  if (d < todayStr) return 'OVERDUE'
  if (d === todayStr) return 'TODAY'
  if (d <= in7.toISOString().slice(0, 10)) return 'NEXT_7'
  if (d <= endMonth.toISOString().slice(0, 10)) return 'THIS_MONTH'
  return 'THIS_MONTH'
}

function groupByBucket(items: ResolveItem[]): Record<TimeBucket, ResolveItem[]> {
  const result: Record<TimeBucket, ResolveItem[]> = {
    OVERDUE:    [],
    TODAY:      [],
    NEXT_7:     [],
    THIS_MONTH: [],
  }
  for (const item of items) {
    result[getBucket(item)].push(item)
  }
  return result
}

// ─── Component ────────────────────────────────────────────────────────────────

const BUCKET_CONFIG: Record<TimeBucket, { label: string; icon: React.ElementType; cls: string }> = {
  OVERDUE:    { label: 'Vencido',          icon: AlertTriangle, cls: 'text-red-400 border-red-500/20 bg-red-500/5' },
  TODAY:      { label: 'Hoy',              icon: Clock,         cls: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
  NEXT_7:     { label: 'Próximos 7 días',  icon: Calendar,      cls: 'text-sky-400 border-sky-500/20 bg-sky-500/5' },
  THIS_MONTH: { label: 'Este mes',         icon: Calendar,      cls: 'text-content-muted border-base-border bg-base-elevated/50' },
}

interface Props {
  pendingItems: PendingItem[]
  purchases:    PurchaseItem[]
  reminders:    Reminder[]
  privacyMode:  boolean
  onComplete?:  (id: string) => void
}

export function ResolveSection({ pendingItems, purchases, reminders, privacyMode, onComplete }: Props) {
  const navigate = useNavigate()

  const all = [
    ...normalizePendingItems(pendingItems),
    ...normalizePurchases(purchases),
    ...normalizeReminders(reminders),
  ]

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-base-border bg-base-surface p-6 text-center">
        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-content-muted">No tienes asuntos financieros urgentes</p>
      </div>
    )
  }

  const groups = groupByBucket(all)
  const buckets: TimeBucket[] = ['OVERDUE', 'TODAY', 'NEXT_7', 'THIS_MONTH']

  return (
    <div className="space-y-3">
      {buckets.map(bucket => {
        const items = groups[bucket]
        if (items.length === 0) return null
        const cfg = BUCKET_CONFIG[bucket]
        const Icon = cfg.icon

        return (
          <div key={bucket} className={cn('rounded-xl border p-4 space-y-2', cfg.cls)}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Icon className={cn('w-3.5 h-3.5', cfg.cls.split(' ')[0])} />
                <p className={cn('text-xs font-bold uppercase tracking-wider', cfg.cls.split(' ')[0])}>
                  {cfg.label}
                </p>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', cfg.cls.split(' ')[0], cfg.cls.split(' ')[1])}>
                  {items.length}
                </span>
              </div>
            </div>

            {items.slice(0, 6).map(item => (
              <ResolveItemRow
                key={`${item.source}-${item.id}`}
                item={item}
                privacyMode={privacyMode}
                onNavigate={() => navigate(item.path)}
                onComplete={item.source === 'REMINDER' && onComplete ? () => onComplete(item.id) : undefined}
              />
            ))}

            {items.length > 6 && (
              <button
                onClick={() => navigate(items[0].path)}
                className="w-full text-center text-[11px] text-content-muted hover:text-content-primary pt-1 transition-colors"
              >
                +{items.length - 6} más
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ResolveItemRow({
  item, privacyMode, onNavigate, onComplete,
}: {
  item:        ResolveItem
  privacyMode: boolean
  onNavigate:  () => void
  onComplete?: () => void
}) {
  const formatDate = (d: string) => {
    const [, m, day] = d.split('-')
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${Number(day)} ${months[Number(m)-1]}`
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-base-hover/30 transition-colors group">
      {/* Direction indicator */}
      {item.direction && (
        <div className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          item.direction === 'INCOMING' ? 'bg-emerald-400' : 'bg-red-400',
        )} />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-content-primary truncate">{item.title}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-content-muted">{item.subtitle}</span>
          {item.dueDate && (
            <span className="text-[10px] text-content-disabled">{formatDate(item.dueDate)}</span>
          )}
        </div>
      </div>

      {/* Amount */}
      {item.amount != null && item.amount > 0 && (
        <p className={cn(
          'text-sm font-semibold tabular-nums flex-shrink-0',
          item.direction === 'INCOMING' ? 'text-emerald-400' : 'text-content-primary',
        )}>
          {maskAmount(formatCurrency(item.amount), privacyMode)}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onComplete && (
          <button
            onClick={e => { e.stopPropagation(); onComplete() }}
            className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium hover:bg-emerald-500/25 transition-all"
          >
            Completar
          </button>
        )}
        <button
          onClick={onNavigate}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-content-disabled hover:text-brand-400 transition-all"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
