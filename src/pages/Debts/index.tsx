import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Landmark, Plus, Eye, TrendingDown, Clock, CheckCircle2,
  AlertCircle, Pencil, Archive, Trash2, CreditCard,
} from 'lucide-react'
import { PageHeader, Card, ConfirmDialog, ActionsMenu } from '@/components/ui'
import { NewDebtModal }            from '@/components/modals/NewDebtModal'
import { EditDebtModal }           from '@/components/modals/EditDebtModal'
import { InstallmentPaymentModal } from '@/components/modals/InstallmentPaymentModal'
import { useWorkspace }            from '@/context/WorkspaceContext'
import { useDebts, useCommitmentSummary, useArchiveDebt, useDeleteDebt } from '@/hooks/useDebts'
import { debtsService }            from '@/services/debts.service'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ApiDebt, ApiDebtInstallment, DebtStatus, DebtType } from '@/types/api'

const debtTypeLabel: Record<DebtType, string> = {
  CASHEA:      'Cashea',
  SAN:         'SAN',
  LOAN:        'Préstamo',
  CREDIT_CARD: 'Tarjeta',
  INSTALLMENT: 'Cuotas',
  PERSONAL:    'Personal',
  OTHER:       'Otro',
}

const debtStatusCls: Record<DebtStatus, string> = {
  ACTIVE:    'bg-brand-600/10 text-brand-400 border-brand-600/20',
  PAID:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PAUSED:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CANCELLED: 'bg-base-elevated text-content-disabled border-base-border',
  DEFAULTED: 'bg-red-500/10 text-red-400 border-red-500/20',
}
const debtStatusLabel: Record<DebtStatus, string> = {
  ACTIVE: 'Activa', PAID: 'Pagada', PAUSED: 'Pausada', CANCELLED: 'Cancelada', DEFAULTED: 'Vencida',
}

export function DebtsPage() {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id
  const navigate = useNavigate()

  const [newModal,       setNewModal]       = useState(false)
  const [editingDebt,    setEditingDebt]    = useState<ApiDebt | null>(null)
  const [payModal,       setPayModal]       = useState(false)
  const [selectedInst,   setSelectedInst]   = useState<ApiDebtInstallment | null>(null)
  const [selectedDebt,   setSelectedDebt]   = useState<ApiDebt | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<ApiDebt | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<ApiDebt | null>(null)
  const [blockedMsg,     setBlockedMsg]     = useState<string | null>(null)

  const { data: debts = [], isLoading, isError, refetch } = useDebts(wsId)
  const { data: commitment } = useCommitmentSummary(wsId)
  const archiveDebt = useArchiveDebt()
  const deleteDebt  = useDeleteDebt()

  const totalDebt    = debts.reduce((s, d) => s + (d.summary?.outstanding ?? 0), 0)
  const totalPaid    = debts.reduce((s, d) => s + (d.summary?.totalPaid ?? 0), 0)
  const pendingCount = debts.reduce((s, d) => s + (d.summary?.pendingCount ?? 0), 0)

  function openPay(debt: ApiDebt, inst: ApiDebtInstallment) {
    setSelectedDebt(debt)
    setSelectedInst(inst)
    setPayModal(true)
  }

  function closePayModal() {
    setPayModal(false)
    setSelectedInst(null)
    setSelectedDebt(null)
  }

  async function handleArchiveOrDelete(debt: ApiDebt) {
    try {
      const hasPayments = await debtsService.hasPayments(debt.id)
      if (hasPayments) {
        setConfirmArchive(debt)
      } else {
        setConfirmDelete(debt)
      }
    } catch {
      toast.error('No pudimos verificar el estado de la deuda.')
    }
  }

  async function handleDeleteCheck(debt: ApiDebt) {
    try {
      const hasPayments = await debtsService.hasPayments(debt.id)
      if (hasPayments) {
        setBlockedMsg(`"${debt.name}" tiene pagos registrados y no puede eliminarse. Puedes archivarla.`)
      } else {
        setConfirmDelete(debt)
      }
    } catch {
      toast.error('No pudimos verificar el estado de la deuda.')
    }
  }

  function DebtActionsMenu({ debt }: { debt: ApiDebt }) {
    const next = debt.summary?.nextInstallment
    return (
      <ActionsMenu items={[
        { label: 'Ver detalle', icon: Eye,      onClick: () => navigate(`/deudas/${debt.id}`) },
        { label: 'Editar',      icon: Pencil,   onClick: () => setEditingDebt(debt) },
        ...(next ? [{ label: 'Registrar pago', icon: CreditCard, onClick: () => openPay(debt, next) }] : []),
        { label: 'Archivar / Cancelar', icon: Archive, onClick: () => handleArchiveOrDelete(debt), separator: true },
        { label: 'Eliminar',   icon: Trash2,   onClick: () => handleDeleteCheck(debt), danger: true },
      ]} />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deudas"
        description={`Compromisos financieros de ${activeWorkspace.name}`}
        actions={
          <button
            onClick={() => setNewModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva deuda
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Deuda pendiente', value: formatCurrency(totalDebt),          icon: Landmark,    color: 'text-red-400' },
          { label: 'Total pagado',    value: formatCurrency(totalPaid),           icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Cuotas activas',  value: String(pendingCount),               icon: Clock,        color: 'text-amber-400' },
          { label: 'Comprometido/mes', value: commitment ? formatCurrency(commitment.monthlyCommitted) : '—', icon: TrendingDown, color: 'text-content-secondary' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">{k.label}</p>
              <k.icon className={cn('w-4 h-4 flex-shrink-0', k.color)} />
            </div>
            <p className={cn('text-xl font-bold tabular-nums', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Liquidez */}
      {commitment && (
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-3">Análisis de liquidez</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-content-muted mb-1">Saldo total</p>
              <p className="text-lg font-bold text-content-primary tabular-nums">{formatCurrency(commitment.totalBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-content-muted mb-1">Comprometido este mes</p>
              <p className="text-lg font-bold text-amber-400 tabular-nums">-{formatCurrency(commitment.monthlyCommitted)}</p>
            </div>
            <div>
              <p className="text-xs text-content-muted mb-1">Libre real</p>
              <p className={cn('text-lg font-bold tabular-nums', commitment.realAvailable >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatCurrency(commitment.realAvailable)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de deudas */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-content-muted text-sm">Cargando deudas...</div>
        ) : isError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm font-semibold text-content-primary">No pudimos cargar esta información</p>
            <p className="text-xs text-content-muted">Verifica tu conexión e intenta de nuevo.</p>
            <button onClick={() => refetch()} className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors">
              Reintentar
            </button>
          </div>
        ) : debts.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Landmark className="w-8 h-8 text-content-disabled mx-auto" />
            <p className="text-sm text-content-muted">No hay deudas registradas.</p>
            <button onClick={() => setNewModal(true)} className="text-xs text-brand-400 hover:text-brand-300">
              + Registrar primera deuda
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-border">
                    {['Nombre', 'Tipo', 'Total', 'Pagado', 'Pendiente', 'Próxima cuota', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-border">
                  {debts.map(debt => {
                    const next = debt.summary?.nextInstallment
                    return (
                      <tr key={debt.id} className="hover:bg-base-hover transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-content-primary">{debt.name}</p>
                          {debt.provider && <p className="text-xs text-content-disabled">{debt.provider}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-content-muted">{debtTypeLabel[debt.type]}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(debt.summary?.totalAmount ?? 0)}</td>
                        <td className="px-4 py-3 text-emerald-400 tabular-nums">{formatCurrency(debt.summary?.totalPaid ?? 0)}</td>
                        <td className="px-4 py-3 text-amber-400 font-semibold tabular-nums">{formatCurrency(debt.summary?.outstanding ?? 0)}</td>
                        <td className="px-4 py-3 text-xs">
                          {next ? (
                            <div>
                              <p className="text-content-primary font-medium">{formatCurrency(Number(next.amount))}</p>
                              <p className="text-content-muted">{formatDate(next.dueDate)}</p>
                            </div>
                          ) : <span className="text-content-disabled">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium', debtStatusCls[debt.status])}>
                            {debtStatusLabel[debt.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {next && (
                              <button
                                onClick={() => openPay(debt, next)}
                                className="px-2.5 py-1 rounded-lg bg-brand-600/15 hover:bg-brand-600/25 text-brand-400 text-xs font-semibold transition-all"
                              >
                                Pagar
                              </button>
                            )}
                            <DebtActionsMenu debt={debt} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-base-border">
              {debts.map(debt => {
                const next = debt.summary?.nextInstallment
                return (
                  <div key={debt.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-content-primary text-sm">{debt.name}</p>
                        <p className="text-xs text-content-muted">{debtTypeLabel[debt.type]}{debt.provider ? ` — ${debt.provider}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium flex-shrink-0', debtStatusCls[debt.status])}>
                          {debtStatusLabel[debt.status]}
                        </span>
                        <DebtActionsMenu debt={debt} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-content-muted">
                        <span>Pagado {formatCurrency(debt.summary?.totalPaid ?? 0)}</span>
                        <span>{debt.summary?.completionPct ?? 0}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-base-elevated overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${debt.summary?.completionPct ?? 0}%` }} />
                      </div>
                      <p className="text-xs text-amber-400 font-semibold">Pendiente: {formatCurrency(debt.summary?.outstanding ?? 0)}</p>
                    </div>
                    {next && (
                      <button
                        onClick={() => openPay(debt, next)}
                        className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all"
                      >
                        Pagar cuota {next.number} — {formatCurrency(Number(next.amount) - Number(next.amountPaid))}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      <NewDebtModal open={newModal} onClose={() => setNewModal(false)} workspaceId={wsId} />

      <EditDebtModal
        open={!!editingDebt}
        onClose={() => setEditingDebt(null)}
        debt={editingDebt}
      />

      <InstallmentPaymentModal
        open={payModal}
        onClose={closePayModal}
        installment={selectedInst}
        debtId={selectedDebt?.id ?? ''}
        debtName={selectedDebt?.name ?? ''}
      />

      <ConfirmDialog
        open={!!confirmArchive}
        title="Archivar deuda"
        description={`¿Archivar "${confirmArchive?.name}"? La deuda quedará cancelada pero se conservará todo el historial de pagos.`}
        confirmLabel="Archivar"
        variant="warning"
        onConfirm={() => {
          if (confirmArchive) archiveDebt.mutate({ id: confirmArchive.id, workspaceId: wsId })
          setConfirmArchive(null)
        }}
        onCancel={() => setConfirmArchive(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar deuda"
        description={`¿Eliminar "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) deleteDebt.mutate({ id: confirmDelete.id, workspaceId: wsId })
          setConfirmDelete(null)
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!blockedMsg}
        title="No se puede eliminar"
        description={blockedMsg ?? ''}
        confirmLabel="Archivar en su lugar"
        cancelLabel="Cerrar"
        variant="warning"
        onConfirm={() => {
          const debt = debts.find(d => blockedMsg?.includes(`"${d.name}"`))
          if (debt) setConfirmArchive(debt)
          setBlockedMsg(null)
        }}
        onCancel={() => setBlockedMsg(null)}
      />
    </div>
  )
}
