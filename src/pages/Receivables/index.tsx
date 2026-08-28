import { useState } from 'react'
import { Clock, Filter, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, EmptyState } from '@/components/ui'
import { PaymentModal } from '@/components/modals/PaymentModal'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useReceivables, useGenerateReceivables } from '@/hooks/useReceivables'
import { useBusinessDashboard } from '@/hooks/useBusinessAnalytics'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ApiReceivable, ReceivableStatus } from '@/types/api'

function dateStr(d: Date) { return d.toISOString().slice(0, 10) }

const statusCfg: Record<ReceivableStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'Pendiente', cls: 'bg-brand-600/10 text-brand-400 border-brand-600/20' },
  PARTIAL:   { label: 'Parcial',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  PAID:      { label: 'Pagado',    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  OVERDUE:   { label: 'Vencido',   cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-base-elevated text-content-disabled border-base-border' },
}

type StatusFilter = ReceivableStatus | ''

export function ReceivablesPage() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const wsId     = activeWorkspace.id
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [payRec, setPayRec]             = useState<ApiReceivable | null>(null)

  const { data: receivables = [], isLoading, isError, refetch } = useReceivables(wsId, {
    from:   dateStr(dateRange.from),
    to:     dateStr(dateRange.to),
    status: statusFilter || undefined,
  })
  const { data: biz } = useBusinessDashboard(wsId, dateRange.from, dateRange.to)

  const generateReceivables = useGenerateReceivables()

  const kpis = [
    { label: 'Total facturado', value: formatCurrency(biz?.billed     ?? 0) },
    { label: 'Cobrado',         value: formatCurrency(biz?.collected  ?? 0) },
    { label: 'Pendiente',       value: formatCurrency(biz?.pending    ?? 0) },
    { label: 'Gastos del mes',  value: formatCurrency(biz?.expenses   ?? 0) },
  ]

  const now = new Date()
  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '',          label: 'Todos'      },
    { value: 'PENDING',   label: 'Pendiente'  },
    { value: 'PARTIAL',   label: 'Parcial'    },
    { value: 'OVERDUE',   label: 'Vencido'    },
    { value: 'PAID',      label: 'Pagado'     },
    { value: 'CANCELLED', label: 'Cancelado'  },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cuentas por Cobrar"
        description="Seguimiento de cobros y facturación"
        actions={
          <button
            onClick={() => generateReceivables.mutate({ workspaceId: wsId, month: now.getMonth() + 1, year: now.getFullYear() })}
            disabled={generateReceivables.isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-base-border text-sm text-content-secondary hover:bg-base-hover transition-colors disabled:opacity-50"
          >
            <Filter className="w-3.5 h-3.5" />
            {generateReceivables.isPending ? 'Generando...' : 'Generar cobros del mes'}
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2">{k.label}</p>
            <p className="text-xl font-bold text-content-primary tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map(opt => (
          <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
              statusFilter === opt.value
                ? 'bg-brand-600/20 border-brand-600/40 text-brand-400'
                : 'border-base-border text-content-muted hover:text-content-primary hover:bg-base-hover',
            )}>
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-center text-sm text-content-muted py-8">Cargando...</p>}
      {isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-content-primary">No pudimos cargar esta información</p>
          <p className="text-xs text-content-muted">Verifica tu conexión e intenta de nuevo.</p>
          <button onClick={() => refetch()} className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors">
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && receivables.length === 0 && (
        <EmptyState icon={Clock} title="Todo al día" description="No hay cobros pendientes en este período." />
      )}

      {receivables.length > 0 && (
        <div className="rounded-xl border border-base-border bg-base-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border bg-base-elevated">
                  {['Cliente','Concepto','Monto','Pagado','Pendiente','Vencimiento','Estado','Acción'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-content-disabled whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {receivables.map(rec => {
                  const pending = Number(rec.amount) - Number(rec.amountPaid)
                  const cfg = statusCfg[rec.status]
                  return (
                    <tr key={rec.id} className="hover:bg-base-elevated/50 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/clients/${rec.clientId}`)} className="text-left hover:text-brand-400 transition-colors">
                          <p className="font-medium text-content-primary">{rec.client.name}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-content-muted max-w-[160px] truncate">{rec.description}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(Number(rec.amount))}</td>
                      <td className="px-4 py-3 text-emerald-400 tabular-nums">{formatCurrency(Number(rec.amountPaid))}</td>
                      <td className="px-4 py-3 text-amber-400 tabular-nums">{formatCurrency(pending)}</td>
                      <td className="px-4 py-3 text-content-muted whitespace-nowrap">{formatDate(String(rec.dueDate).slice(0, 10))}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded border whitespace-nowrap', cfg.cls)}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {rec.status !== 'PAID' && rec.status !== 'CANCELLED' && (
                          <button onClick={() => setPayRec(rec)}
                            className="text-xs px-2 py-1 rounded-lg bg-brand-600/15 text-brand-400 border border-brand-600/25 hover:bg-brand-600/25 transition-colors whitespace-nowrap">
                            Registrar pago
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaymentModal open={!!payRec} onClose={() => setPayRec(null)} receivable={payRec} />
    </div>
  )
}
