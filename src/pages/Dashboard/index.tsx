import {
  TrendingUp, TrendingDown, Wallet, Clock,
  CircleDollarSign, Lock, Zap, CheckCircle2, AlertCircle, AlertTriangle,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApp }       from '@/context/AppContext'
import { useDashboardSummary, useCashFlow, useExpenseDistribution } from '@/hooks/useDashboard'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { formatCurrency, getGreeting, toDateString } from '@/lib/utils'
import {
  KpiCard,
  CashFlowChart,
  ExpenseDistributionChart,
  UpcomingPayments,
  BusinessSummary,
  PendingClients,
  AccountsWidget,
  MonthlyProjection,
  QuickActions,
  AnnualGoalsWidget,
} from '@/components/dashboard'
import type { KpiMetric, CashFlowData, ExpenseCategory } from '@/types'
import { cn } from '@/lib/utils'
import { useBusinessDashboard, usePendingReceivables } from '@/hooks/useBusinessAnalytics'
import { PersonalDashboard } from './PersonalDashboard'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ─── Business Dashboard ───────────────────────────────────────────────────────

function BusinessDashboard() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const { focusMode } = useApp()
  const wsId = activeWorkspace.id
  const year = dateRange.from.getFullYear()

  const { data: summary, isError: summaryError, refetch: refetchSummary } = useDashboardSummary(wsId, dateRange.from, dateRange.to)
  const { data: cashFlow } = useCashFlow(wsId, year)
  const { data: expDist  } = useExpenseDistribution(wsId, dateRange.from, dateRange.to)

  const from = toDateString(dateRange.from)
  const to   = toDateString(dateRange.to)
  const { data: accounts  = [] } = useAccounts(wsId)
  const { data: pendingTxs = [] } = useTransactions({ workspaceId: wsId, status: 'PENDING', from, to })

  const { data: bizData }       = useBusinessDashboard(wsId, dateRange.from, dateRange.to)
  const { data: pendingRecv = [] } = usePendingReceivables(wsId, 5)

  const monthLabel = `${MONTH_NAMES[dateRange.from.getMonth()]} ${year}`

  const kpis: KpiMetric[] = summary
    ? [
        { id: 'income',    label: 'Ingresos del Mes',     value: formatCurrency(summary.income.total),    icon: TrendingUp,       trend: 'up',   trendValue: `${summary.income.count} movs`,  colorVariant: 'success' },
        { id: 'expenses',  label: 'Gastos del Mes',       value: formatCurrency(summary.expenses.total),  icon: TrendingDown,     trend: 'down', trendValue: `${summary.expenses.count} movs`, colorVariant: 'danger'  },
        { id: 'balance',   label: 'Balance del Mes',      value: formatCurrency(summary.balance),         icon: Wallet,           trend: summary.balance >= 0 ? 'up' : 'down', colorVariant: summary.balance >= 0 ? 'success' : 'danger' },
        { id: 'pending',   label: 'Pendiente por Cobrar', value: formatCurrency(summary.pending.total),   icon: Clock,            subtitle: `${summary.pending.count} movimientos`, colorVariant: 'warning' },
        { id: 'available', label: 'Disponible Real',      value: formatCurrency(summary.available),       icon: CircleDollarSign, colorVariant: 'default' },
        { id: 'committed', label: 'Comprometido',         value: formatCurrency(summary.committed),       icon: Lock,             subtitle: 'Pagos pendientes', colorVariant: 'warning' },
      ]
    : []

  const chartCashFlow: CashFlowData[] = (cashFlow ?? []).map(c => ({ month: c.month, income: c.income, expenses: c.expenses }))
  const chartExpDist: ExpenseCategory[] = (expDist ?? []).map(e => ({ name: e.name, value: e.value, color: e.color }))
  const accountsForWidget = accounts.map(a => ({
    id: a.id, name: a.name, balance: a.currentBalance,
    type: a.type.toLowerCase() as 'bank' | 'digital' | 'cash' | 'crypto',
    workspaceId: a.workspaceId,
  }))
  const payments = pendingTxs.slice(0, 6).map(tx => ({
    id: tx.id, name: tx.description, category: tx.category.name,
    amount: Number(tx.amount), dueDate: tx.transactionDate.slice(0, 10), paid: false,
    workspaceId: tx.workspaceId,
  }))
  const projectionData = summary
    ? { available: summary.available, receivable: summary.pending.total, committed: summary.committed }
    : { available: 0, receivable: 0, committed: 0 }

  const balance    = summary?.balance ?? 0
  const liquidez   = balance > 1000 ? 'green' : balance > 0 ? 'yellow' : 'red'
  const flujo      = summary && summary.income.total > summary.expenses.total ? 'green' : summary && summary.income.total > 0 ? 'yellow' : 'red'
  const compromisos = summary && summary.committed < summary.income.total * 0.5 ? 'green' : 'yellow'
  const semaforos  = [
    { label: 'Liquidez',    color: liquidez,    desc: liquidez    === 'green' ? 'Saludable'  : liquidez    === 'yellow' ? 'Cuidado'   : 'Riesgo'    },
    { label: 'Flujo',       color: flujo,       desc: flujo       === 'green' ? 'Positivo'   : flujo       === 'yellow' ? 'Ajustado'  : 'Negativo'  },
    { label: 'Compromisos', color: compromisos, desc: compromisos === 'green' ? 'Controlado' : 'Elevado' },
  ]
  const semCls  = { green: 'text-emerald-400', yellow: 'text-amber-400', red: 'text-red-400' }
  const semIcon = { green: CheckCircle2,        yellow: AlertTriangle,    red: AlertCircle    }

  if (summaryError) return (
    <div className="space-y-5 pb-20 md:pb-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-bold text-content-primary">{getGreeting()}, Fernando!</h1>
      </div>
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-sm font-semibold text-content-primary">No pudimos cargar tu resumen financiero</p>
        <p className="text-xs text-content-muted">Verifica tu conexión o intenta de nuevo.</p>
        <button onClick={() => refetchSummary()} className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors">
          Reintentar
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-content-primary">{getGreeting()}, Fernando!</h1>
          <p className="text-sm text-content-muted mt-0.5">Resumen — {monthLabel}</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600/10 border border-brand-600/20">
          <span className="text-base leading-none">{activeWorkspace.emoji}</span>
          <span className="text-xs font-semibold text-brand-400">{activeWorkspace.name}</span>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2">
          {semaforos.map(s => {
            const Icon = semIcon[s.color as keyof typeof semIcon]
            return (
              <div key={s.label} className="rounded-xl border border-base-border bg-base-surface p-3 flex items-center gap-2">
                <Icon className={cn('w-4 h-4 flex-shrink-0', semCls[s.color as keyof typeof semCls])} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">{s.label}</p>
                  <p className={cn('text-xs font-semibold', semCls[s.color as keyof typeof semCls])}>{s.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {focusMode && summary && (
        <div className="rounded-xl border border-brand-600/30 bg-brand-600/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-brand-400" />
            <p className="text-sm font-semibold text-brand-400">Modo Enfoque activado</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Disponible',       value: formatCurrency(summary.available),    color: 'text-emerald-400' },
              { label: 'Pendiente cobrar', value: formatCurrency(summary.pending.total), color: 'text-amber-400'  },
              { label: 'Comprometido',     value: formatCurrency(summary.committed),    color: 'text-red-400'     },
            ].map(k => (
              <div key={k.label}>
                <p className="text-[10px] text-content-muted mb-0.5">{k.label}</p>
                <p className={cn('text-lg font-bold tabular-nums', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {kpis.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map(m => <KpiCard key={m.id} metric={m} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-base-border bg-base-surface p-5 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {!focusMode && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CashFlowChart data={chartCashFlow.length > 0 ? chartCashFlow : Array.from({ length: 12 }, (_, i) => ({ month: ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][i], income: 0, expenses: 0 }))} />
          </div>
          <MonthlyProjection data={projectionData} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!focusMode && <ExpenseDistributionChart data={chartExpDist} />}
        <UpcomingPayments payments={payments} />
        <AccountsWidget accounts={accountsForWidget} />
      </div>

      {bizData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BusinessSummary rows={[
            { label: 'Facturado',            value: formatCurrency(bizData.billed),         rawValue: bizData.billed,         type: 'income'  },
            { label: 'Cobrado',              value: formatCurrency(bizData.collected),       rawValue: bizData.collected,       type: 'income'  },
            { label: 'Pendiente por cobrar', value: formatCurrency(bizData.pending),         rawValue: bizData.pending,         type: 'neutral' },
            { label: 'Gastos del mes',       value: `-${formatCurrency(bizData.expenses)}`,  rawValue: -bizData.expenses,       type: 'expense' },
            { label: 'Margen operativo',     value: formatCurrency(bizData.operatingProfit), rawValue: bizData.operatingProfit, type: 'total'   },
          ]} />
          <PendingClients clients={pendingRecv.map(r => ({
            id:      r.id,
            name:    r.client.companyName ?? r.client.name,
            amount:  parseFloat(r.amount) - parseFloat(r.amountPaid),
            dueDate: r.dueDate,
            status:  (r.status === 'OVERDUE' ? 'overdue' : r.status === 'PARTIAL' ? 'partial' : 'pending') as 'overdue' | 'pending' | 'partial' | 'paid',
          }))} />
        </div>
      )}

      {!focusMode && <AnnualGoalsWidget />}
      <QuickActions />
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { activeWorkspace } = useWorkspace()
  const isAds = activeWorkspace.type === 'BUSINESS'

  return isAds ? <BusinessDashboard /> : <PersonalDashboard />
}
