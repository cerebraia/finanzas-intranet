import { useState } from 'react'
import { ArrowLeftRight, Plus, Search, Ban, Pencil } from 'lucide-react'
import { PageHeader, ConfirmDialog } from '@/components/ui'
import { TransactionStatusBadge } from '@/components/ui/TransactionStatusBadge'
import { TransactionModal } from '@/components/modals/TransactionModal'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTransactions, useCancelTransaction } from '@/hooks/useTransactions'
import { cn, formatCurrency, formatDate, toDateString } from '@/lib/utils'
import type { ApiTransaction, TransactionType } from '@/types/api'

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export function MovementsPage() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<ApiTransaction | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ApiTransaction | null>(null)

  const { data: transactions = [], isLoading } = useTransactions({
    workspaceId: activeWorkspace.id,
    from: toDateString(dateRange.from),
    to:   toDateString(dateRange.to),
    type: typeFilter || undefined,
    q:    search || undefined,
  })

  const cancelTx = useCancelTransaction()

  function handleConfirmCancel() {
    if (!cancelTarget) return
    cancelTx.mutate({ id: cancelTarget.id, workspaceId: cancelTarget.workspaceId })
    setCancelTarget(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Movimientos"
        description={`${MONTH_NAMES[dateRange.from.getMonth()]} ${dateRange.from.getFullYear()} — ${transactions.length} registros`}
        actions={
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo movimiento
          </button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted" />
          <input
            type="text"
            placeholder="Buscar descripción, notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-base-border bg-base-elevated text-sm text-content-primary placeholder:text-content-disabled focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        {(['', 'INCOME', 'EXPENSE'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
              typeFilter === t
                ? 'bg-brand-600/20 border-brand-600/40 text-brand-400'
                : 'border-base-border text-content-muted hover:text-content-primary hover:bg-base-hover',
            )}
          >
            {t === '' ? 'Todos' : t === 'INCOME' ? 'Ingresos' : 'Gastos'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-base-border bg-base-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-elevated">
                {['Fecha', 'Descripción', 'Categoría', 'Cuenta', 'Estado', 'Monto', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-content-disabled whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-content-muted text-sm">Cargando...</td></tr>
              )}
              {!isLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <ArrowLeftRight className="w-8 h-8 text-content-disabled mx-auto mb-2" />
                    <p className="text-sm text-content-muted">No hay movimientos en este período</p>
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-base-elevated/50 transition-colors">
                  <td className="px-4 py-3 text-content-muted whitespace-nowrap">
                    {formatDate(tx.transactionDate.slice(0, 10))}
                  </td>
                  <td className="px-4 py-3 text-content-primary max-w-[200px] truncate">{tx.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-content-secondary">
                      {tx.category.icon} {tx.category.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-content-muted whitespace-nowrap">{tx.account.name}</td>
                  <td className="px-4 py-3"><TransactionStatusBadge status={tx.status} /></td>
                  <td className={cn(
                    'px-4 py-3 font-semibold tabular-nums whitespace-nowrap',
                    tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400',
                    tx.status === 'CANCELLED' && 'line-through opacity-50'
                  )}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {tx.status !== 'CANCELLED' && (
                        <>
                          <button
                            title="Editar"
                            onClick={() => { setEditing(tx); setModalOpen(true) }}
                            className="p-1.5 rounded text-content-muted hover:text-brand-400 hover:bg-brand-600/10 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Anular"
                            onClick={() => setCancelTarget(tx)}
                            className="p-1.5 rounded text-content-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        editingTransaction={editing}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Anular movimiento"
        description={`¿Confirmas que deseas anular "${cancelTarget?.description}"? Esta acción queda registrada en el historial.`}
        confirmLabel="Anular"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}
