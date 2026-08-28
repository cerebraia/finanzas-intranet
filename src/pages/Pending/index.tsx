import { Clock, AlertCircle, Circle, CheckCircle2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card, Badge } from '@/components/ui'
import { useWorkspace } from '@/context/WorkspaceContext'
import { usePendingItems } from '@/hooks/usePendingItems'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { PendingItem } from '@/types/api'

const typeLabel: Record<PendingItem['sourceType'], string> = {
  RECEIVABLE:        'Cobro',
  PAYROLL:           'Nómina',
  RECURRING_EXPENSE: 'Gasto fijo',
  DEBT:              'Cuota',
}
const typeBadge: Record<PendingItem['sourceType'], 'info' | 'warning' | 'default' | 'danger'> = {
  RECEIVABLE:        'info',
  PAYROLL:           'warning',
  RECURRING_EXPENSE: 'default',
  DEBT:              'danger',
}
const statusCls: Record<string, string> = {
  PENDING:   'bg-brand-600/10 text-brand-400 border-brand-600/20',
  PARTIAL:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PAID:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OVERDUE:   'bg-red-500/10 text-red-400 border-red-500/20',
  CANCELLED: 'bg-base-elevated text-content-disabled border-base-border',
}
const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagado', OVERDUE: 'Vencido', CANCELLED: 'Cancelado',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'OVERDUE') return <AlertCircle className="w-4 h-4 text-red-400" />
  if (status === 'PAID')    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
  if (status === 'PARTIAL') return <Circle       className="w-4 h-4 text-amber-400" />
  return <Circle className="w-4 h-4 text-brand-400" />
}

export function PendingPage() {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id
  const navigate = useNavigate()

  const { data: items = [], isLoading } = usePendingItems(wsId)

  const overdue  = items.filter(i => i.status === 'OVERDUE')
  const upcoming = items.filter(i => i.status !== 'OVERDUE')

  const totalPending = items.reduce((s, i) => s + i.pendingAmount, 0)
  const overdueTotal = overdue.reduce((s, i) => s + i.pendingAmount, 0)

  function handleItemClick(item: PendingItem) {
    if (item.sourceType === 'RECEIVABLE') navigate('/receivables')
    else if (item.sourceType === 'PAYROLL') navigate('/payroll')
    else navigate('/fixed-expenses')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pendientes"
        description={`Todos los compromisos de ${activeWorkspace.name}`}
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-base-border bg-base-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">Total pendiente</p>
          <p className="text-xl font-bold text-amber-400 tabular-nums">{formatCurrency(totalPending)}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400 mb-1">Vencido</p>
          <p className="text-xl font-bold text-red-400 tabular-nums">{formatCurrency(overdueTotal)}</p>
        </div>
        <div className="rounded-xl border border-base-border bg-base-surface p-4 col-span-2 md:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">Ítems</p>
          <p className="text-xl font-bold text-content-primary">{items.length}</p>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-content-muted text-sm">Cargando pendientes...</Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <p className="text-sm font-semibold text-content-primary">Todo al día</p>
          <p className="text-xs text-content-muted">No tienes compromisos pendientes.</p>
        </Card>
      ) : (
        <>
          {/* Vencidos */}
          {overdue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-red-400">Vencidos ({overdue.length})</h2>
              </div>
              <Card className="divide-y divide-base-border overflow-hidden">
                {overdue.map(item => (
                  <PendingItemRow key={item.id} item={item} onClick={handleItemClick} />
                ))}
              </Card>
            </div>
          )}

          {/* Próximos */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-content-primary">Próximos ({upcoming.length})</h2>
              </div>
              <Card className="divide-y divide-base-border overflow-hidden">
                {upcoming.map(item => (
                  <PendingItemRow key={item.id} item={item} onClick={handleItemClick} />
                ))}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PendingItemRow({ item, onClick }: { item: PendingItem; onClick: (item: PendingItem) => void }) {
  return (
    <div
      className="flex items-center gap-3 p-4 hover:bg-base-hover transition-colors cursor-pointer"
      onClick={() => onClick(item)}
    >
      <StatusIcon status={item.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-content-primary truncate">{item.title}</p>
          <Badge variant={typeBadge[item.sourceType]} className="flex-shrink-0">{typeLabel[item.sourceType]}</Badge>
        </div>
        <p className="text-xs text-content-muted truncate">{item.description}</p>
        <p className="text-xs text-content-disabled">Vence {formatDate(item.dueDate)}</p>
      </div>
      <div className="text-right flex-shrink-0 space-y-1">
        <p className="text-sm font-bold text-amber-400 tabular-nums">{formatCurrency(item.pendingAmount)}</p>
        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium', statusCls[item.status] ?? statusCls['PENDING'])}>
          {statusLabel[item.status] ?? item.status}
        </span>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-content-disabled flex-shrink-0" />
    </div>
  )
}
