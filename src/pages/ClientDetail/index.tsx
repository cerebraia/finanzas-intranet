import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, DollarSign, Clock, Pencil } from 'lucide-react'
import { PageHeader, Badge, Card } from '@/components/ui'
import { ClientModal } from '@/components/modals/ClientModal'
import { PaymentModal } from '@/components/modals/PaymentModal'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useClient, useClientReceivables, useClientPayments, useClientProfitability } from '@/hooks/useClients'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ApiReceivable, ReceivableStatus } from '@/types/api'

type Tab = 'summary' | 'billing' | 'payments'

const statusCfg: Record<ReceivableStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'Pendiente', cls: 'bg-brand-600/10 text-brand-400 border-brand-600/20' },
  PARTIAL:   { label: 'Parcial',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  PAID:      { label: 'Pagado',    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  OVERDUE:   { label: 'Vencido',   cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-base-elevated text-content-disabled border-base-border' },
}

export function ClientDetailPage() {
  const { id = '' }    = useParams<{ id: string }>()
  const navigate       = useNavigate()
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const [tab, setTab]               = useState<Tab>('summary')
  const [editOpen, setEditOpen]     = useState(false)
  const [payRec, setPayRec]         = useState<ApiReceivable | null>(null)

  const { data: client, isLoading }     = useClient(id, wsId)
  const { data: receivables = [] }      = useClientReceivables(id, wsId)
  const { data: payments = [] }         = useClientPayments(id, wsId)
  const { data: profitability }         = useClientProfitability(id, wsId)

  if (isLoading) return <div className="py-16 text-center text-content-muted text-sm">Cargando...</div>
  if (!client)   return <div className="py-16 text-center text-content-muted text-sm">Cliente no encontrado</div>

  const activeServices  = client.clientServices.filter(cs => cs.status === 'ACTIVE')
  const totalMonthly    = activeServices.filter(cs => cs.billingFrequency === 'MONTHLY').reduce((s, cs) => s + Number(cs.price), 0)
  const totalBilled     = receivables.filter(r => r.status !== 'CANCELLED').reduce((s, r) => s + Number(r.amount), 0)
  const totalPaid       = receivables.reduce((s, r) => s + Number(r.amountPaid), 0)
  const pendingAmount   = totalBilled - totalPaid
  const lastPayment     = payments[0]

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary',  label: 'Resumen' },
    { key: 'billing',  label: 'Facturación' },
    { key: 'payments', label: 'Pagos' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/clients')}
          className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <PageHeader
            title={client.name}
            description={client.companyName ?? 'Cliente individual'}
            actions={
              <button onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-base-border text-sm text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
            }
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Mensualidad total',  value: formatCurrency(totalMonthly),  icon: DollarSign, color: 'text-brand-400' },
          { label: 'Total facturado',    value: formatCurrency(totalBilled),   icon: TrendingUp,  color: 'text-emerald-400' },
          { label: 'Total cobrado',      value: formatCurrency(totalPaid),     icon: TrendingUp,  color: 'text-emerald-400' },
          { label: 'Pendiente actual',   value: formatCurrency(pendingAmount), icon: Clock,       color: 'text-amber-400' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">{k.label}</p>
              <k.icon className={cn('w-4 h-4 flex-shrink-0', k.color)} />
            </div>
            <p className="text-xl font-bold text-content-primary tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Rentabilidad */}
      {profitability && (
        <Card className="p-4 flex flex-wrap gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">Ingresos cobrados</p>
            <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(profitability.collected)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">Costos directos</p>
            <p className="text-lg font-bold text-red-400 tabular-nums">{formatCurrency(profitability.directCosts)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">Margen directo</p>
            <p className={cn('text-lg font-bold tabular-nums', profitability.margin >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {formatCurrency(profitability.margin)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">Rentabilidad estimada</p>
            <p className="text-lg font-bold text-brand-400">{profitability.marginPct}%</p>
          </div>
          {lastPayment && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">Último pago</p>
              <p className="text-sm text-content-secondary">{formatDate(String(lastPayment.paymentDate).slice(0, 10))}</p>
            </div>
          )}
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-base-border">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t.key
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-content-muted hover:text-content-secondary'
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Resumen */}
      {tab === 'summary' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-content-secondary">Servicios contratados</h3>
          {activeServices.length === 0 ? (
            <p className="text-sm text-content-muted">Sin servicios activos.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeServices.map(cs => (
                <Card key={cs.id} className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-content-primary text-sm">{cs.service.name}</p>
                      <p className="text-xs text-content-muted mt-0.5">Cobro: día {cs.billingDay} · {cs.billingFrequency === 'MONTHLY' ? 'Mensual' : 'Único'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-content-primary tabular-nums">{formatCurrency(Number(cs.price))}</p>
                      <Badge variant={cs.status === 'ACTIVE' ? 'success' : 'warning'} className="mt-1">
                        {cs.status === 'ACTIVE' ? 'Activo' : 'Pausado'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Facturación */}
      {tab === 'billing' && (
        <div className="rounded-xl border border-base-border bg-base-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-elevated">
                {['Concepto','Vencimiento','Total','Pagado','Pendiente','Estado',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-content-disabled whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {receivables.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-content-muted text-sm">Sin facturas todavía</td></tr>
              )}
              {receivables.map(rec => {
                const pending = Number(rec.amount) - Number(rec.amountPaid)
                const cfg = statusCfg[rec.status]
                return (
                  <tr key={rec.id} className="hover:bg-base-elevated/50 transition-colors">
                    <td className="px-4 py-3 text-content-primary max-w-[180px] truncate">{rec.description}</td>
                    <td className="px-4 py-3 text-content-muted whitespace-nowrap">{formatDate(String(rec.dueDate).slice(0, 10))}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(Number(rec.amount))}</td>
                    <td className="px-4 py-3 text-emerald-400 tabular-nums">{formatCurrency(Number(rec.amountPaid))}</td>
                    <td className="px-4 py-3 text-amber-400 tabular-nums">{formatCurrency(pending)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded border', cfg.cls)}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {rec.status !== 'PAID' && rec.status !== 'CANCELLED' && (
                        <button onClick={() => setPayRec(rec)}
                          className="text-xs px-2 py-1 rounded-lg bg-brand-600/15 text-brand-400 border border-brand-600/25 hover:bg-brand-600/25 transition-colors">
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === 'payments' && (
        <div className="rounded-xl border border-base-border bg-base-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-elevated">
                {['Fecha','Cuenta','Monto','Referencia','Factura'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-content-disabled whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {payments.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-content-muted text-sm">Sin pagos registrados</td></tr>
              )}
              {payments.map(pay => (
                <tr key={pay.id} className="hover:bg-base-elevated/50 transition-colors">
                  <td className="px-4 py-3 text-content-muted">{formatDate(String(pay.paymentDate).slice(0, 10))}</td>
                  <td className="px-4 py-3 text-content-secondary">{pay.account.name}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-400 tabular-nums">{formatCurrency(Number(pay.amount))}</td>
                  <td className="px-4 py-3 text-content-muted">{pay.reference ?? '—'}</td>
                  <td className="px-4 py-3 text-content-muted truncate max-w-[160px]">{pay.receivable.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClientModal open={editOpen} onClose={() => setEditOpen(false)} editingClient={client} />
      <PaymentModal open={!!payRec} onClose={() => setPayRec(null)} receivable={payRec} />
    </div>
  )
}
