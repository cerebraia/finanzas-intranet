import { useState } from 'react'
import { TrendingDown, Plus, Pencil, Ban } from 'lucide-react'
import { PageHeader, StatCard, ConfirmDialog } from '@/components/ui'
import { TransactionStatusBadge } from '@/components/ui/TransactionStatusBadge'
import { TransactionModal } from '@/components/modals/TransactionModal'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTransactions, useCancelTransaction } from '@/hooks/useTransactions'
import { formatCurrency, formatDate, toDateString, cn } from '@/lib/utils'
import type { ApiTransaction } from '@/types/api'

export function ExpensesPage() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState<ApiTransaction | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ApiTransaction | null>(null)

  const { data: txs = [], isLoading } = useTransactions({
    workspaceId: activeWorkspace.id,
    from: toDateString(dateRange.from),
    to:   toDateString(dateRange.to),
    type: 'EXPENSE',
  })

  const cancelTx = useCancelTransaction()

  const total     = txs.filter(t => t.status === 'COMPLETED').reduce((s, t) => s + Number(t.amount), 0)
  const pending   = txs.filter(t => t.status === 'PENDING').reduce((s, t) => s + Number(t.amount), 0)
  const completed = txs.filter(t => t.status === 'COMPLETED').length

  function handleConfirmCancel() {
    if (!cancelTarget) return
    cancelTx.mutate({ id: cancelTarget.id, workspaceId: cancelTarget.workspaceId })
    setCancelTarget(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gastos"
        description="Registro y análisis de gastos"
        actions={
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar gasto
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total gastos"    value={formatCurrency(total)}   icon={TrendingDown} trend="down" />
        <StatCard label="Registros"       value={String(txs.length)}      icon={TrendingDown} />
        <StatCard label="Completados"     value={String(completed)}       icon={TrendingDown} />
        <StatCard label="Pendiente pagar" value={formatCurrency(pending)} icon={TrendingDown} trend="neutral" />
      </div>

      <div className="rounded-xl border border-base-border bg-base-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-elevated">
                {['Fecha','Descripción','Categoría','Cuenta','Estado','Monto',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-content-disabled whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-content-muted">Cargando...</td></tr>}
              {!isLoading && txs.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center text-content-muted text-sm">No hay gastos en este período</td></tr>
              )}
              {txs.map((tx) => (
                <tr key={tx.id} className="hover:bg-base-elevated/50 transition-colors">
                  <td className="px-4 py-3 text-content-muted whitespace-nowrap">{formatDate(tx.transactionDate.slice(0,10))}</td>
                  <td className="px-4 py-3 text-content-primary max-w-[200px] truncate">{tx.description}</td>
                  <td className="px-4 py-3 text-content-secondary whitespace-nowrap">{tx.category.icon} {tx.category.name}</td>
                  <td className="px-4 py-3 text-content-muted">{tx.account.name}</td>
                  <td className="px-4 py-3"><TransactionStatusBadge status={tx.status} /></td>
                  <td className={cn('px-4 py-3 font-semibold tabular-nums text-red-400', tx.status === 'CANCELLED' && 'line-through opacity-50')}>
                    -{formatCurrency(Number(tx.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {tx.status !== 'CANCELLED' && (
                        <>
                          <button onClick={() => { setEditing(tx); setModalOpen(true) }} className="p-1.5 rounded text-content-muted hover:text-brand-400 hover:bg-brand-600/10 transition-colors" title="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setCancelTarget(tx)} className="p-1.5 rounded text-content-muted hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Anular">
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
        defaultType="EXPENSE"
        editingTransaction={editing}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Anular gasto"
        description={`¿Confirmas que deseas anular "${cancelTarget?.description}"? El historial se mantiene.`}
        confirmLabel="Anular"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}
