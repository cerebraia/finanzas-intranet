import { useNavigate } from 'react-router-dom'
import { Megaphone, TrendingUp, DollarSign, Clock, TrendingDown, ArrowRight, Users } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useBusinessDashboard, usePendingReceivables } from '@/hooks/useBusinessAnalytics'
import { useClients } from '@/hooks/useClients'
import { usePayrollSummary } from '@/hooks/usePayroll'
import { formatCurrency, cn } from '@/lib/utils'
import type { ReceivableStatus } from '@/types/api'

const statusCls: Record<ReceivableStatus, string> = {
  PENDING:   'bg-brand-600/10 text-brand-400 border-brand-600/20',
  PARTIAL:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PAID:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OVERDUE:   'bg-red-500/10 text-red-400 border-red-500/20',
  CANCELLED: 'bg-base-elevated text-content-disabled border-base-border',
}
const statusLabel: Record<ReceivableStatus, string> = {
  PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagado', OVERDUE: 'Vencido', CANCELLED: 'Cancelado',
}

export function FernandoADSPage() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const wsId = activeWorkspace.id
  const navigate = useNavigate()

  const { data: biz }          = useBusinessDashboard(wsId, dateRange.from, dateRange.to)
  const { data: pending = [] }   = usePendingReceivables(wsId, 5)
  const { data: clients = [] }   = useClients(wsId)
  const { data: payrollSummary } = usePayrollSummary(wsId, dateRange.from, dateRange.to)

  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const monthLabel = `${MONTH_NAMES[dateRange.from.getMonth()]} ${dateRange.from.getFullYear()}`

  const payrollWeight = biz && payrollSummary && biz.collected > 0
    ? (payrollSummary.expected / biz.collected) * 100
    : null

  const summaryRows = biz ? [
    { label: 'Facturado',           value: formatCurrency(biz.billed),          type: 'income'  as const },
    { label: 'Cobrado',             value: formatCurrency(biz.collected),        type: 'income'  as const },
    { label: 'Pendiente por cobrar',value: formatCurrency(biz.pending),          type: 'neutral' as const },
    { label: 'Gastos del mes',      value: `-${formatCurrency(biz.expenses)}`,   type: 'expense' as const },
    { label: 'Beneficio operativo', value: formatCurrency(biz.operatingProfit),  type: 'total'   as const },
  ] : []

  const colorMap = { income: 'text-emerald-400', expense: 'text-red-400', neutral: 'text-content-secondary', total: '' }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fernando ADS"
        description={`Resumen del negocio — ${monthLabel}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {biz && [
          { label: 'Facturación',        value: formatCurrency(biz.billed),          icon: TrendingUp,   color: 'text-emerald-400' },
          { label: 'Cobrado',            value: formatCurrency(biz.collected),        icon: DollarSign,   color: 'text-emerald-400' },
          { label: 'Pendiente cobrar',   value: formatCurrency(biz.pending),          icon: Clock,        color: 'text-amber-400' },
          { label: 'Gastos operativos',  value: formatCurrency(biz.expenses),         icon: TrendingDown, color: 'text-red-400' },
          { label: 'Beneficio operativo',value: formatCurrency(biz.operatingProfit),  icon: Megaphone,    color: biz.operatingProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Clientes activos',   value: String(clients.filter(c => c.status === 'ACTIVE').length), icon: Megaphone, color: 'text-brand-400' },
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

      {/* Nómina del equipo */}
      {payrollSummary && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-content-primary">Nómina del equipo</h3>
            </div>
            <button onClick={() => navigate('/payroll')} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Ver equipo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Costo mensual',  value: formatCurrency(payrollSummary.expected),    color: 'text-content-primary' },
              { label: 'Pagado',         value: formatCurrency(payrollSummary.paid),         color: 'text-emerald-400' },
              { label: 'Pendiente',      value: formatCurrency(payrollSummary.outstanding),  color: 'text-amber-400' },
              { label: 'Peso de nómina', value: payrollWeight !== null ? `${payrollWeight.toFixed(1)}%` : '—', color: payrollWeight && payrollWeight > 50 ? 'text-red-400' : 'text-content-secondary' },
            ].map(k => (
              <div key={k.label} className="rounded-lg bg-base-elevated border border-base-border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-content-muted mb-1">{k.label}</p>
                <p className={cn('text-sm font-bold tabular-nums', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Resumen del negocio */}
        {summaryRows.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-content-primary">Resumen financiero</h3>
            </div>
            <div className="space-y-2">
              {summaryRows.map((row, i) => (
                <div key={i} className={cn('flex justify-between py-1.5', row.type === 'total' && 'border-t border-base-border mt-1 pt-3')}>
                  <span className={cn('text-sm', row.type === 'total' ? 'font-semibold text-content-primary' : 'text-content-muted')}>{row.label}</span>
                  <span className={cn('text-sm font-semibold tabular-nums', colorMap[row.type], row.type === 'total' && 'text-base')}>{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pendientes próximos */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-content-primary">Pendientes próximos</h3>
            </div>
            <button onClick={() => navigate('/receivables')} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-content-muted">Todo al día 🎉</p>
          ) : (
            <ul className="space-y-2">
              {pending.map(rec => (
                <li key={rec.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-content-primary truncate">{rec.client.name}</p>
                    <p className="text-xs text-content-muted">{rec.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-amber-400 tabular-nums">{formatCurrency(Number(rec.amount) - Number(rec.amountPaid))}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', statusCls[rec.status])}>{statusLabel[rec.status]}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
