import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { PageHeader, Card, Badge } from '@/components/ui'
import { InstallmentPaymentModal } from '@/components/modals/InstallmentPaymentModal'
import { useWorkspace }           from '@/context/WorkspaceContext'
import { useDebt }                from '@/hooks/useDebts'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ApiDebtInstallment, DebtType, InstallmentStatus } from '@/types/api'

const debtTypeLabel: Record<DebtType, string> = {
  CASHEA: 'Cashea', SAN: 'SAN', LOAN: 'Préstamo', CREDIT_CARD: 'Tarjeta',
  INSTALLMENT: 'Cuotas', PERSONAL: 'Personal', OTHER: 'Otro',
}
const instStatusCls: Record<InstallmentStatus, string> = {
  PENDING:   'bg-brand-600/10 text-brand-400 border-brand-600/20',
  PARTIAL:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PAID:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OVERDUE:   'bg-red-500/10 text-red-400 border-red-500/20',
  CANCELLED: 'bg-base-elevated text-content-disabled border-base-border',
}
const instStatusLabel: Record<InstallmentStatus, string> = {
  PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagada', OVERDUE: 'Vencida', CANCELLED: 'Cancelada',
}
function StatusIcon({ s }: { s: InstallmentStatus }) {
  if (s === 'PAID')    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
  if (s === 'OVERDUE') return <AlertCircle  className="w-3.5 h-3.5 text-red-400" />
  if (s === 'PARTIAL') return <Circle       className="w-3.5 h-3.5 text-amber-400" />
  return <Circle className="w-3.5 h-3.5 text-brand-400" />
}

type Tab = 'resumen' | 'cuotas' | 'pagos'

export function DebtDetailPage() {
  const { id = '' }         = useParams<{ id: string }>()
  const { activeWorkspace } = useWorkspace()
  const wsId                = activeWorkspace.id
  const navigate            = useNavigate()

  const [tab, setTab]           = useState<Tab>('resumen')
  const [payModal, setPayModal] = useState(false)
  const [selectedInst, setSelectedInst] = useState<ApiDebtInstallment | null>(null)

  const { data: debt, isLoading } = useDebt(id, wsId)

  function openPay(inst: ApiDebtInstallment) {
    setSelectedInst(inst)
    setPayModal(true)
  }

  if (isLoading) return <div className="p-8 text-center text-content-muted text-sm">Cargando deuda...</div>
  if (!debt) return (
    <div className="p-8 text-center space-y-3">
      <p className="text-content-muted text-sm">Deuda no encontrada.</p>
      <button onClick={() => navigate('/debts')} className="text-xs text-brand-400 hover:text-brand-300">
        ← Volver
      </button>
    </div>
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'cuotas',  label: 'Cuotas' },
    { key: 'pagos',   label: 'Pagos' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/debts')} className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title={debt.name}
          description={`${debtTypeLabel[debt.type]}${debt.provider ? ` — ${debt.provider}` : ''}`}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total financiado', value: formatCurrency(Number(debt.financedAmount)), color: 'text-content-primary' },
          { label: 'Pagado',           value: formatCurrency(debt.summary.totalPaid),      color: 'text-emerald-400' },
          { label: 'Pendiente',        value: formatCurrency(debt.summary.outstanding),    color: 'text-amber-400' },
          { label: 'Progreso',         value: `${debt.summary.completionPct}%`,            color: debt.summary.completionPct >= 100 ? 'text-emerald-400' : 'text-brand-400' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">{k.label}</p>
            <p className={cn('text-xl font-bold tabular-nums', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <Card className="p-4">
        <div className="flex justify-between text-xs text-content-muted mb-2">
          <span>{debt.summary.paidCount} de {debt.installments} cuotas pagadas</span>
          <span>{debt.summary.completionPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-base-elevated overflow-hidden">
          <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${debt.summary.completionPct}%` }} />
        </div>
        {debt.summary.nextInstallment && (
          <p className="text-xs text-content-muted mt-2">
            Próxima cuota: <span className="font-semibold text-amber-400">{formatCurrency(Number(debt.summary.nextInstallment.amount))}</span>
            {' '}— vence {formatDate(debt.summary.nextInstallment.dueDate)}
          </p>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-base-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === t.key ? 'border-brand-500 text-brand-400' : 'border-transparent text-content-muted hover:text-content-primary'
          )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {tab === 'resumen' && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-content-primary">Información de la deuda</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-content-muted text-xs mb-0.5">Monto original</p><p className="font-semibold">{formatCurrency(Number(debt.originalAmount))}</p></div>
            <div><p className="text-content-muted text-xs mb-0.5">Inicial / Enganche</p><p className="font-semibold">{formatCurrency(Number(debt.downPayment))}</p></div>
            <div><p className="text-content-muted text-xs mb-0.5">Cuotas</p><p className="font-semibold">{debt.installments}</p></div>
            <div><p className="text-content-muted text-xs mb-0.5">Cuota mensual</p><p className="font-semibold text-brand-400">{formatCurrency(Number(debt.monthlyAmount))}</p></div>
            <div><p className="text-content-muted text-xs mb-0.5">Inicio</p><p className="font-semibold">{formatDate(debt.startDate)}</p></div>
            <div><p className="text-content-muted text-xs mb-0.5">Estado</p>
              <Badge variant={debt.status === 'ACTIVE' ? 'info' : debt.status === 'PAID' ? 'success' : 'default'}>
                {debt.status}
              </Badge>
            </div>
          </div>
          {debt.notes && <p className="text-xs text-content-muted border-t border-base-border pt-3">{debt.notes}</p>}
        </Card>
      )}

      {/* Tab: Cuotas */}
      {tab === 'cuotas' && (
        <Card className="overflow-hidden">
          {debt.debtInstallments.length === 0 ? (
            <div className="p-8 text-center text-content-muted text-sm">Sin cuotas generadas.</div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-base-border">
                      {['#', 'Monto', 'Pagado', 'Pendiente', 'Vencimiento', 'Estado', 'Acción'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-border">
                    {debt.debtInstallments.map(inst => {
                      const pendingAmt = Number(inst.amount) - Number(inst.amountPaid)
                      return (
                        <tr key={inst.id} className="hover:bg-base-hover transition-colors">
                          <td className="px-4 py-3 font-semibold text-content-primary">Cuota {inst.number}</td>
                          <td className="px-4 py-3 tabular-nums">{formatCurrency(Number(inst.amount))}</td>
                          <td className="px-4 py-3 text-emerald-400 tabular-nums">{formatCurrency(Number(inst.amountPaid))}</td>
                          <td className="px-4 py-3 text-amber-400 font-semibold tabular-nums">{formatCurrency(pendingAmt)}</td>
                          <td className="px-4 py-3 text-xs text-content-muted">{formatDate(inst.dueDate)}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium', instStatusCls[inst.status])}>
                              <StatusIcon s={inst.status} />{instStatusLabel[inst.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {inst.status !== 'PAID' && inst.status !== 'CANCELLED' && (
                              <button onClick={() => openPay(inst)} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                                <DollarSign className="w-3 h-3" /> Pagar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-base-border">
                {debt.debtInstallments.map(inst => {
                  const pendingAmt = Number(inst.amount) - Number(inst.amountPaid)
                  return (
                    <div key={inst.id} className="p-4 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-content-primary text-sm">Cuota {inst.number}</p>
                          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium', instStatusCls[inst.status])}>
                            {instStatusLabel[inst.status]}
                          </span>
                        </div>
                        <p className="text-xs text-content-muted">{formatDate(inst.dueDate)}</p>
                        <p className="text-xs text-amber-400 font-semibold mt-0.5">Pendiente: {formatCurrency(pendingAmt)}</p>
                      </div>
                      {inst.status !== 'PAID' && inst.status !== 'CANCELLED' && (
                        <button onClick={() => openPay(inst)} className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold">
                          Pagar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Tab: Pagos */}
      {tab === 'pagos' && (
        <Card className="overflow-hidden">
          {!debt.payments || debt.payments.length === 0 ? (
            <div className="p-8 text-center text-content-muted text-sm">Sin pagos registrados.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border">
                  {['Fecha', 'Cuota', 'Monto', 'Cuenta', 'Referencia'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {debt.payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-base-hover transition-colors">
                    <td className="px-4 py-3 text-xs text-content-muted">{formatDate(pay.paymentDate)}</td>
                    <td className="px-4 py-3 text-xs text-content-muted">#{pay.installment.number}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400 tabular-nums">{formatCurrency(Number(pay.amount))}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{pay.account.name}</td>
                    <td className="px-4 py-3 text-xs text-content-disabled">{pay.reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <InstallmentPaymentModal
        open={payModal}
        onClose={() => { setPayModal(false); setSelectedInst(null) }}
        installment={selectedInst}
        debtId={debt.id}
        debtName={debt.name}
      />
    </div>
  )
}
