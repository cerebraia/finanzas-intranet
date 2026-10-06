import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PiggyBank, Plus, Eye, AlertCircle, CheckCircle2, Circle, Pencil, Archive, Trash2 } from 'lucide-react'
import { PageHeader, Card, ActionsMenu, ConfirmDialog, QuickPayButton } from '@/components/ui'
import { NewDebtModal }      from '@/components/modals/NewDebtModal'
import { EditDebtModal }     from '@/components/modals/EditDebtModal'
import { useWorkspace }      from '@/context/WorkspaceContext'
import { useDebts, useArchiveDebt, useDeleteDebt } from '@/hooks/useDebts'
import { debtsService }      from '@/services/debts.service'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ApiDebt, InstallmentStatus } from '@/types/api'

function StatusIcon({ s }: { s: InstallmentStatus }) {
  if (s === 'PAID')    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
  if (s === 'OVERDUE') return <AlertCircle  className="w-3.5 h-3.5 text-red-400" />
  return <Circle className="w-3.5 h-3.5 text-brand-400" />
}

export function SANPage() {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id
  const navigate = useNavigate()

  const [newModal,       setNewModal]       = useState(false)
  const [editingDebt,    setEditingDebt]    = useState<ApiDebt | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<ApiDebt | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<ApiDebt | null>(null)
  const [blockedMsg,     setBlockedMsg]     = useState<string | null>(null)

  const { data: debts = [], isLoading } = useDebts(wsId, 'SAN')
  const archiveDebt = useArchiveDebt()
  const deleteDebt  = useDeleteDebt()

  const totalDebt    = debts.reduce((s, d) => s + (d.summary?.outstanding ?? 0), 0)
  const pendingCount = debts.reduce((s, d) => s + (d.summary?.pendingCount ?? 0), 0)

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

  return (
    <div className="space-y-5">
      <PageHeader
        title="SAN"
        description="Sistema de ahorro y número (cuotas SAN)"
        actions={
          <button onClick={() => setNewModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all">
            <Plus className="w-3.5 h-3.5" /> Nuevo SAN
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pendiente total', value: formatCurrency(totalDebt), color: 'text-amber-400' },
          { label: 'SANs activos',   value: String(debts.length),      color: 'text-content-primary' },
          { label: 'Cuotas activas', value: String(pendingCount),      color: 'text-brand-400' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">{k.label}</p>
            <p className={cn('text-xl font-bold tabular-nums', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-content-muted text-sm">Cargando...</Card>
      ) : debts.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <PiggyBank className="w-8 h-8 text-content-disabled mx-auto" />
          <p className="text-sm text-content-muted">No hay SANs registrados.</p>
          <button onClick={() => setNewModal(true)} className="text-xs text-brand-400 hover:text-brand-300">+ Registrar SAN</button>
        </Card>
      ) : (
        <div className="space-y-4">
          {debts.map(debt => (
            <Card key={debt.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-semibold text-content-primary">{debt.name}</p>
                  {debt.provider && <p className="text-xs text-content-muted">{debt.provider}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{formatCurrency(debt.summary?.outstanding ?? 0)}</p>
                    <p className="text-xs text-content-muted">pendiente</p>
                  </div>
                  <ActionsMenu items={[
                    { label: 'Ver detalle', icon: Eye,     onClick: () => navigate(`/deudas/${debt.id}`) },
                    { label: 'Editar',      icon: Pencil,  onClick: () => setEditingDebt(debt) },
                    { label: 'Archivar',    icon: Archive, onClick: () => setConfirmArchive(debt), separator: true },
                    { label: 'Eliminar',    icon: Trash2,  onClick: () => handleDeleteCheck(debt), danger: true },
                  ]} />
                </div>
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-xs text-content-muted">
                  <span>{debt.summary?.paidCount}/{debt.installments} cuotas</span>
                  <span>{debt.summary?.completionPct ?? 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-base-elevated overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${debt.summary?.completionPct ?? 0}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                {debt.debtInstallments.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').slice(0, 3).map(inst => (
                  <div key={inst.id} className="flex items-center justify-between py-1.5 border-b border-base-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <StatusIcon s={inst.status} />
                      <span className="text-xs text-content-primary">Cuota {inst.number}</span>
                      <span className="text-xs text-content-disabled">{formatDate(inst.dueDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{formatCurrency(Number(inst.amount) - Number(inst.amountPaid))}</span>
                      <QuickPayButton
                        item={{
                          id:            inst.id,
                          sourceType:    'DEBT',
                          title:         debt.name,
                          description:   `Cuota ${inst.number}`,
                          amount:        Number(inst.amount),
                          amountPaid:    Number(inst.amountPaid),
                          pendingAmount: Number(inst.amount) - Number(inst.amountPaid),
                          dueDate:       inst.dueDate,
                          status:        inst.status,
                          workspaceId:   wsId,
                          entityId:      inst.id,
                          direction:     'OUTGOING',
                        }}
                        workspaceId={wsId}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewDebtModal open={newModal} onClose={() => setNewModal(false)} workspaceId={wsId} />
      <EditDebtModal
        open={!!editingDebt}
        onClose={() => setEditingDebt(null)}
        debt={editingDebt}
      />
      <ConfirmDialog
        open={!!confirmArchive}
        title="Archivar SAN"
        description={`¿Archivar "${confirmArchive?.name}"? Se conservará todo el historial de pagos.`}
        confirmLabel="Archivar"
        variant="warning"
        onConfirm={() => { if (confirmArchive) archiveDebt.mutate({ id: confirmArchive.id, workspaceId: wsId }); setConfirmArchive(null) }}
        onCancel={() => setConfirmArchive(null)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar"
        description={`¿Eliminar "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => { if (confirmDelete) deleteDebt.mutate({ id: confirmDelete.id, workspaceId: wsId }); setConfirmDelete(null) }}
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
