import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, Eye, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui'
import { NewDebtModal }          from '@/components/modals/NewDebtModal'
import { InstallmentPaymentModal } from '@/components/modals/InstallmentPaymentModal'
import { useWorkspace }           from '@/context/WorkspaceContext'
import { useDebts }               from '@/hooks/useDebts'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ApiDebt, ApiDebtInstallment, InstallmentStatus } from '@/types/api'

function StatusIcon({ s }: { s: InstallmentStatus }) {
  if (s === 'PAID')    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
  if (s === 'OVERDUE') return <AlertCircle  className="w-3.5 h-3.5 text-red-400" />
  return <Circle className="w-3.5 h-3.5 text-brand-400" />
}

export function CasheaPage() {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id
  const navigate = useNavigate()

  const [newModal, setNewModal]     = useState(false)
  const [payModal, setPayModal]     = useState(false)
  const [selectedInst, setSelectedInst] = useState<ApiDebtInstallment | null>(null)
  const [selectedDebt, setSelectedDebt] = useState<ApiDebt | null>(null)

  const { data: debts = [], isLoading } = useDebts(wsId, 'CASHEA')

  const totalDebt    = debts.reduce((s, d) => s + (d.summary?.outstanding ?? 0), 0)
  const pendingCount = debts.reduce((s, d) => s + (d.summary?.pendingCount ?? 0), 0)

  function openPay(debt: ApiDebt, inst: ApiDebtInstallment) {
    setSelectedDebt(debt); setSelectedInst(inst); setPayModal(true)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cashea"
        description="Compras financiadas con Cashea"
        actions={
          <button onClick={() => setNewModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all">
            <Plus className="w-3.5 h-3.5" /> Nueva compra
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Deuda pendiente', value: formatCurrency(totalDebt), color: 'text-red-400' },
          { label: 'Compras activas', value: String(debts.length),     color: 'text-content-primary' },
          { label: 'Cuotas activas',  value: String(pendingCount),     color: 'text-amber-400' },
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
          <CreditCard className="w-8 h-8 text-content-disabled mx-auto" />
          <p className="text-sm text-content-muted">No hay compras Cashea registradas.</p>
          <button onClick={() => setNewModal(true)} className="text-xs text-brand-400 hover:text-brand-300">+ Registrar compra</button>
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
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{formatCurrency(debt.summary?.outstanding ?? 0)}</p>
                    <p className="text-xs text-content-muted">pendiente</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs text-content-muted">
                    <span>{debt.summary?.paidCount}/{debt.installments} cuotas</span>
                    <span>{debt.summary?.completionPct ?? 0}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-base-elevated overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${debt.summary?.completionPct ?? 0}%` }} />
                  </div>
                </div>

                {/* Cuotas próximas */}
                <div className="space-y-1.5">
                  {debt.debtInstallments.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').slice(0, 3).map(inst => (
                    <div key={inst.id} className="flex items-center justify-between py-1.5 border-b border-base-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <StatusIcon s={inst.status} />
                        <span className="text-xs text-content-primary">Cuota {inst.number}</span>
                        <span className="text-xs text-content-disabled">{formatDate(inst.dueDate)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums">{formatCurrency(Number(inst.amount) - Number(inst.amountPaid))}</span>
                        <button onClick={() => openPay(debt, inst)} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                          Pagar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-3">
                  <button onClick={() => navigate(`/deudas/${debt.id}`)} className="flex items-center gap-1 text-xs text-content-muted hover:text-content-primary transition-colors">
                    <Eye className="w-3 h-3" /> Ver detalle completo
                  </button>
                </div>
              </Card>
          ))}
        </div>
      )}

      <NewDebtModal open={newModal} onClose={() => setNewModal(false)} workspaceId={wsId} />
      <InstallmentPaymentModal
        open={payModal}
        onClose={() => { setPayModal(false); setSelectedInst(null); setSelectedDebt(null) }}
        installment={selectedInst}
        debtId={selectedDebt?.id ?? ''}
        debtName={selectedDebt?.name ?? ''}
      />
    </div>
  )
}
