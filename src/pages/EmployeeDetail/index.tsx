import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, DollarSign } from 'lucide-react'
import { PageHeader, Card, Badge } from '@/components/ui'
import { PayrollPaymentModal } from '@/components/modals/PayrollPaymentModal'
import { useWorkspace }        from '@/context/WorkspaceContext'
import { useEmployee, useEmployeePayments } from '@/hooks/useEmployees'
import { usePayrollObligations } from '@/hooks/usePayroll'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ApiPayrollObligation, PayrollObligationStatus } from '@/types/api'

const statusCls: Record<PayrollObligationStatus, string> = {
  PENDING:   'bg-brand-600/10 text-brand-400 border-brand-600/20',
  PARTIAL:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PAID:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OVERDUE:   'bg-red-500/10 text-red-400 border-red-500/20',
  CANCELLED: 'bg-base-elevated text-content-disabled border-base-border',
}
const statusLabel: Record<PayrollObligationStatus, string> = {
  PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagado', OVERDUE: 'Vencido', CANCELLED: 'Cancelado',
}

type Tab = 'resumen' | 'reglas' | 'obligaciones' | 'pagos'

export function EmployeeDetailPage() {
  const { id = '' }           = useParams<{ id: string }>()
  const { activeWorkspace }   = useWorkspace()
  const wsId                  = activeWorkspace.id
  const navigate              = useNavigate()

  const [tab, setTab]         = useState<Tab>('resumen')
  const [payModal, setPayModal] = useState(false)
  const [selectedObligation, setSelectedObligation] = useState<ApiPayrollObligation | null>(null)

  const { data: emp,          isLoading: loadEmp }  = useEmployee(id, wsId)
  const { data: payments = [], isLoading: loadPay }  = useEmployeePayments(id, wsId)
  const { data: obligations = [] }                   = usePayrollObligations(wsId, { employeeId: id })

  const activeRule  = emp?.payrollRules.find(r => r.status === 'ACTIVE')
  const totalPaid   = payments.reduce((s, p) => s + Number(p.amount), 0)
  const outstanding = obligations
    .filter(o => o.status !== 'PAID' && o.status !== 'CANCELLED')
    .reduce((s, o) => s + (Number(o.amount) - Number(o.amountPaid)), 0)

  function openPay(obl: ApiPayrollObligation) {
    setSelectedObligation(obl)
    setPayModal(true)
  }

  if (loadEmp) {
    return (
      <div className="p-8 text-center text-content-muted text-sm">Cargando empleado...</div>
    )
  }

  if (!emp) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-content-muted text-sm">Empleado no encontrado.</p>
        <button onClick={() => navigate('/payroll')} className="text-xs text-brand-400 hover:text-brand-300">
          ← Volver al equipo
        </button>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'resumen',      label: 'Resumen' },
    { key: 'reglas',       label: 'Reglas de pago' },
    { key: 'obligaciones', label: 'Obligaciones' },
    { key: 'pagos',        label: 'Pagos' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/payroll')} className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title={emp.name}
          description={emp.role ?? 'Sin rol asignado'}
        />
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pago mensual',    value: activeRule ? formatCurrency(Number(activeRule.amount)) : '—',   color: 'text-content-primary' },
          { label: 'Próxima fecha',   value: activeRule ? `Día ${activeRule.paymentDay}` : '—',              color: 'text-content-secondary' },
          { label: 'Total pagado',    value: formatCurrency(totalPaid),                                       color: 'text-emerald-400' },
          { label: 'Pendiente',       value: formatCurrency(outstanding),                                     color: outstanding > 0 ? 'text-amber-400' : 'text-content-muted' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">{k.label}</p>
            <p className={cn('text-lg font-bold tabular-nums', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Estado del empleado */}
      <div className="flex items-center gap-2">
        <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'default'}>
          {emp.status === 'ACTIVE' ? 'Activo' : emp.status === 'PAUSED' ? 'Pausado' : 'Inactivo'}
        </Badge>
        {emp.email && <span className="text-xs text-content-muted">{emp.email}</span>}
        {emp.phone && <span className="text-xs text-content-muted">{emp.phone}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-base-border overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === t.key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-content-muted hover:text-content-primary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {tab === 'resumen' && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-content-primary mb-4">Historial reciente de obligaciones</h3>
          {obligations.length === 0 ? (
            <p className="text-sm text-content-muted">Sin obligaciones registradas.</p>
          ) : (
            <div className="space-y-2">
              {obligations.slice(0, 5).map(obl => {
                const pendingAmt = Number(obl.amount) - Number(obl.amountPaid)
                return (
                  <div key={obl.id} className="flex items-center justify-between py-2 border-b border-base-border last:border-0">
                    <div>
                      <p className="text-sm text-content-primary">{obl.description}</p>
                      <p className="text-xs text-content-muted">Vence {formatDate(obl.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-amber-400">{formatCurrency(pendingAmt)}</span>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium', statusCls[obl.status])}>
                        {statusLabel[obl.status]}
                      </span>
                      {obl.status !== 'PAID' && obl.status !== 'CANCELLED' && (
                        <button onClick={() => openPay(obl)} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                          Pagar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Reglas de pago */}
      {tab === 'reglas' && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-content-primary mb-4">Reglas de pago</h3>
          {emp.payrollRules.length === 0 ? (
            <p className="text-sm text-content-muted">Sin reglas de pago configuradas.</p>
          ) : (
            <div className="space-y-3">
              {emp.payrollRules.map(rule => (
                <div key={rule.id} className="rounded-xl border border-base-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-content-primary tabular-nums">
                      {formatCurrency(Number(rule.amount))} / mes
                    </p>
                    <Badge variant={rule.status === 'ACTIVE' ? 'success' : 'default'}>
                      {rule.status === 'ACTIVE' ? 'Activa' : rule.status === 'PAUSED' ? 'Pausada' : 'Cancelada'}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-content-muted">
                    <span>Día de pago: {rule.paymentDay}</span>
                    <span>Desde: {formatDate(rule.startDate)}</span>
                    {rule.endDate && <span>Hasta: {formatDate(rule.endDate)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Obligaciones */}
      {tab === 'obligaciones' && (
        <Card className="overflow-hidden">
          {obligations.length === 0 ? (
            <div className="p-8 text-center text-content-muted text-sm">Sin obligaciones registradas.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border">
                  {['Período', 'Monto', 'Pagado', 'Pendiente', 'Vencimiento', 'Estado', 'Acción'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {obligations.map(obl => {
                  const pendingAmt = Number(obl.amount) - Number(obl.amountPaid)
                  return (
                    <tr key={obl.id} className="hover:bg-base-hover transition-colors">
                      <td className="px-4 py-3 text-content-muted text-xs">{obl.periodMonth}/{obl.periodYear}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(Number(obl.amount))}</td>
                      <td className="px-4 py-3 text-emerald-400 tabular-nums">{formatCurrency(Number(obl.amountPaid))}</td>
                      <td className="px-4 py-3 text-amber-400 font-semibold tabular-nums">{formatCurrency(pendingAmt)}</td>
                      <td className="px-4 py-3 text-xs text-content-muted">{formatDate(obl.dueDate)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium', statusCls[obl.status])}>
                          {statusLabel[obl.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {obl.status !== 'PAID' && obl.status !== 'CANCELLED' && (
                          <button onClick={() => openPay(obl)} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                            <DollarSign className="w-3 h-3" /> Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Tab: Pagos */}
      {tab === 'pagos' && (
        <Card className="overflow-hidden">
          {loadPay ? (
            <div className="p-8 text-center text-content-muted text-sm">Cargando pagos...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-content-muted text-sm">Sin pagos registrados.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border">
                  {['Fecha', 'Monto', 'Cuenta', 'Obligación', 'Referencia'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-base-hover transition-colors">
                    <td className="px-4 py-3 text-xs text-content-muted">{formatDate(pay.paymentDate)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400 tabular-nums">{formatCurrency(Number(pay.amount))}</td>
                    <td className="px-4 py-3 text-content-secondary text-xs">{pay.account.name}</td>
                    <td className="px-4 py-3 text-content-muted text-xs truncate max-w-[160px]">{pay.payrollObligation.description}</td>
                    <td className="px-4 py-3 text-content-disabled text-xs">{pay.reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <PayrollPaymentModal
        open={payModal}
        onClose={() => { setPayModal(false); setSelectedObligation(null) }}
        obligation={selectedObligation}
      />
    </div>
  )
}
