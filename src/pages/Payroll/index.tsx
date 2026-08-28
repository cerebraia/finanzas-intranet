import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, BriefcaseBusiness, DollarSign, Clock, CheckCircle2,
  AlertCircle, Circle, Plus, Eye, Zap
} from 'lucide-react'
import { PageHeader, Card, Badge } from '@/components/ui'
import { PayrollPaymentModal } from '@/components/modals/PayrollPaymentModal'
import { NewEmployeeModal }    from '@/components/modals/NewEmployeeModal'
import { useWorkspace }        from '@/context/WorkspaceContext'
import { useEmployees }        from '@/hooks/useEmployees'
import { usePayrollObligations, usePayrollSummary, useGeneratePayroll } from '@/hooks/usePayroll'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ApiPayrollObligation, PayrollObligationStatus } from '@/types/api'

type Tab = 'equipo' | 'nomina'

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
const StatusIcon = ({ s }: { s: PayrollObligationStatus }) => {
  if (s === 'PAID')    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
  if (s === 'OVERDUE') return <AlertCircle  className="w-3.5 h-3.5 text-red-400" />
  if (s === 'PARTIAL') return <Circle       className="w-3.5 h-3.5 text-amber-400" />
  return <Circle className="w-3.5 h-3.5 text-brand-400" />
}

export function PayrollPage() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const wsId = activeWorkspace.id
  const navigate = useNavigate()

  const [tab, setTab]                   = useState<Tab>('equipo')
  const [payModal, setPayModal]         = useState(false)
  const [newEmpModal, setNewEmpModal]   = useState(false)
  const [selectedObligation, setSelectedObligation] = useState<ApiPayrollObligation | null>(null)

  const { data: employees = [], isLoading: loadEmp, isError: errEmp, refetch: refetchEmp } = useEmployees(wsId)
  const { data: obligations = [], isLoading: loadObl, isError: errObl, refetch: refetchObl } = usePayrollObligations(wsId)
  const { data: summary }    = usePayrollSummary(wsId, dateRange.from, dateRange.to)
  const generatePayroll      = useGeneratePayroll()

  const totalMonthly = employees.reduce((sum, emp) => {
    const active = emp.payrollRules.find(r => r.status === 'ACTIVE')
    return sum + (active ? Number(active.amount) : 0)
  }, 0)

  function openPay(obl: ApiPayrollObligation) {
    setSelectedObligation(obl)
    setPayModal(true)
  }

  function handleGenerate() {
    const m = dateRange.from.getMonth() + 1
    const y = dateRange.from.getFullYear()
    generatePayroll.mutate({ workspaceId: wsId, month: m, year: y })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Equipo & Nómina"
        description={`Gestiona el equipo y los pagos de ${activeWorkspace.name}`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generatePayroll.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-base-border text-xs font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              {generatePayroll.isPending ? 'Generando...' : 'Generar nómina'}
            </button>
            <button
              onClick={() => setNewEmpModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo miembro
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Miembros activos',   value: String(employees.filter(e => e.status === 'ACTIVE').length), icon: Users,         color: 'text-brand-400' },
          { label: 'Costo mensual',      value: formatCurrency(totalMonthly),            icon: BriefcaseBusiness, color: 'text-content-primary' },
          { label: 'Pagado este mes',    value: formatCurrency(summary?.paid ?? 0),      icon: CheckCircle2,      color: 'text-emerald-400' },
          { label: 'Pendiente este mes', value: formatCurrency(summary?.outstanding ?? 0), icon: Clock,           color: 'text-amber-400' },
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-base-border">
        {(['equipo', 'nomina'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-content-muted hover:text-content-primary'
            )}
          >
            {t === 'equipo' ? 'Equipo' : 'Obligaciones'}
          </button>
        ))}
      </div>

      {/* Tab: Equipo */}
      {tab === 'equipo' && (
        <Card className="overflow-hidden">
          {loadEmp ? (
            <div className="p-8 text-center text-content-muted text-sm">Cargando equipo...</div>
          ) : errEmp ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-sm font-semibold text-content-primary">No pudimos cargar esta información</p>
              <p className="text-xs text-content-muted">Verifica tu conexión e intenta de nuevo.</p>
              <button onClick={() => refetchEmp()} className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors">
                Reintentar
              </button>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-content-muted text-sm">
              No hay miembros. Usa <strong>+ Nuevo miembro</strong> para agregar.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-base-border">
                      {['Nombre', 'Rol', 'Pago mensual', 'Día de pago', 'Estado', 'Acciones'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-border">
                    {employees.map(emp => {
                      const active = emp.payrollRules.find(r => r.status === 'ACTIVE')
                      return (
                        <tr key={emp.id} className="hover:bg-base-hover transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-content-primary">{emp.name}</p>
                            {emp.email && <p className="text-xs text-content-disabled">{emp.email}</p>}
                          </td>
                          <td className="px-4 py-3 text-content-muted">{emp.role ?? '—'}</td>
                          <td className="px-4 py-3 font-semibold text-content-primary tabular-nums">
                            {active ? formatCurrency(Number(active.amount)) : '—'}
                          </td>
                          <td className="px-4 py-3 text-content-muted">
                            {active ? `Día ${active.paymentDay}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'default'}>
                              {emp.status === 'ACTIVE' ? 'Activo' : emp.status === 'PAUSED' ? 'Pausado' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => navigate(`/equipo/${emp.id}`)}
                              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                            >
                              <Eye className="w-3 h-3" /> Ver
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-base-border">
                {employees.map(emp => {
                  const active = emp.payrollRules.find(r => r.status === 'ACTIVE')
                  return (
                    <div key={emp.id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-content-primary text-sm">{emp.name}</p>
                        <p className="text-xs text-content-muted">{emp.role ?? 'Sin rol'}</p>
                        {active && (
                          <p className="text-xs text-content-secondary mt-0.5">
                            {formatCurrency(Number(active.amount))} / mes — día {active.paymentDay}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/equipo/${emp.id}`)}
                        className="p-2 rounded-lg text-brand-400 hover:bg-base-hover transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Tab: Obligaciones */}
      {tab === 'nomina' && (
        <Card className="overflow-hidden">
          {loadObl ? (
            <div className="p-8 text-center text-content-muted text-sm">Cargando obligaciones...</div>
          ) : errObl ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-sm font-semibold text-content-primary">No pudimos cargar esta información</p>
              <p className="text-xs text-content-muted">Verifica tu conexión e intenta de nuevo.</p>
              <button onClick={() => refetchObl()} className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors">
                Reintentar
              </button>
            </div>
          ) : obligations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm text-content-muted">No hay obligaciones para este período.</p>
              <button
                onClick={handleGenerate}
                disabled={generatePayroll.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-base-border text-xs font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                Generar nómina del mes
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-base-border">
                      {['Empleado', 'Descripción', 'Monto', 'Pagado', 'Pendiente', 'Vencimiento', 'Estado', 'Acción'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-border">
                    {obligations.map(obl => {
                      const pendingAmt = Number(obl.amount) - Number(obl.amountPaid)
                      return (
                        <tr key={obl.id} className="hover:bg-base-hover transition-colors">
                          <td className="px-4 py-3 font-medium text-content-primary">{obl.employee.name}</td>
                          <td className="px-4 py-3 text-content-muted text-xs max-w-[180px] truncate">{obl.description}</td>
                          <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(Number(obl.amount))}</td>
                          <td className="px-4 py-3 text-emerald-400 tabular-nums">{formatCurrency(Number(obl.amountPaid))}</td>
                          <td className="px-4 py-3 text-amber-400 font-semibold tabular-nums">{formatCurrency(pendingAmt)}</td>
                          <td className="px-4 py-3 text-content-muted text-xs">{formatDate(obl.dueDate)}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium', statusCls[obl.status])}>
                              <StatusIcon s={obl.status} />
                              {statusLabel[obl.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {obl.status !== 'PAID' && obl.status !== 'CANCELLED' && (
                              <button
                                onClick={() => openPay(obl)}
                                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                              >
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

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-base-border">
                {obligations.map(obl => {
                  const pendingAmt = Number(obl.amount) - Number(obl.amountPaid)
                  return (
                    <div key={obl.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-content-primary text-sm">{obl.employee.name}</p>
                          <p className="text-xs text-content-muted">{obl.description}</p>
                        </div>
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium flex-shrink-0', statusCls[obl.status])}>
                          {statusLabel[obl.status]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs text-content-muted">Pendiente: <span className="text-amber-400 font-semibold">{formatCurrency(pendingAmt)}</span></p>
                          <p className="text-xs text-content-muted">Vence: {formatDate(obl.dueDate)}</p>
                        </div>
                        {obl.status !== 'PAID' && obl.status !== 'CANCELLED' && (
                          <button
                            onClick={() => openPay(obl)}
                            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all"
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      )}

      <PayrollPaymentModal
        open={payModal}
        onClose={() => { setPayModal(false); setSelectedObligation(null) }}
        obligation={selectedObligation}
      />
      <NewEmployeeModal
        open={newEmpModal}
        onClose={() => setNewEmpModal(false)}
        workspaceId={wsId}
      />
    </div>
  )
}
