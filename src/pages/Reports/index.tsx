import { useState } from 'react'
import { Download, TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpDown, Lock, DollarSign, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Tooltip as RCTooltip } from 'recharts'
import { PageHeader, Card, Skeleton } from '@/components/ui'
import { useWorkspace }          from '@/context/WorkspaceContext'
import { useFinancialSummary, useExpenseBreakdown, usePeriodComparison, useCashflowSeries } from '@/hooks/useAnalytics'
import { useTransactions }       from '@/hooks/useTransactions'
import { analyticsService }      from '@/services/analytics.service'
import { formatCurrency, toDateString, cn } from '@/lib/utils'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1625', border: '1px solid #2d2547', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#c4b5fd', fontWeight: 600 },
}

const PALETTE = ['#8b5cf6','#a78bfa','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#c4b5fd','#ddd6fe']

function pctLabel(v: number | null): string {
  if (v == null) return 'Nuevo'
  if (v === 0)   return '0%'
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

function CompareCard({ label, current, prev, diffAbs, diffPct, colorPositive = true }: { label: string; current: number; prev: number; diffAbs: number; diffPct: number | null; colorPositive?: boolean }) {
  const isPositive = colorPositive ? diffAbs >= 0 : diffAbs <= 0
  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2">{label}</p>
      <p className="text-xl font-bold text-content-primary tabular-nums">{formatCurrency(current)}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-content-disabled">{formatCurrency(prev)} anterior</span>
        <span className={cn('text-xs font-semibold', isPositive ? 'text-emerald-400' : 'text-red-400')}>
          {pctLabel(diffPct)}
        </span>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const wsId = activeWorkspace.id
  const from = toDateString(dateRange.from)
  const to   = toDateString(dateRange.to)
  const year = dateRange.from.getFullYear()

  const { data: summary, isLoading: loadSum, isError: summaryError, refetch: refetchSummary }  = useFinancialSummary(wsId, dateRange.from, dateRange.to)
  const { data: breakdown = [], isLoading: loadBrk } = useExpenseBreakdown(wsId, dateRange.from, dateRange.to)
  const { data: comparison }                    = usePeriodComparison(wsId, dateRange.from, dateRange.to)
  const { data: cashflow = [] }                 = useCashflowSeries(wsId, year)

  // Top 10 transacciones del período
  const { data: topExpenses = [] } = useTransactions({ workspaceId: wsId, type: 'EXPENSE', status: 'COMPLETED', from, to })
  const { data: topIncome   = [] } = useTransactions({ workspaceId: wsId, type: 'INCOME',  status: 'COMPLETED', from, to })

  const top10Exp = [...topExpenses].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 10)
  const top10Inc = [...topIncome  ].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 10)

  const [activeTab, setActiveTab] = useState<'resumen' | 'gastos' | 'ingresos' | 'comparativa'>('resumen')

  function exportCsv() {
    const rows = topExpenses.map(t => ({
      fecha: t.transactionDate,
      tipo:  t.type,
      descripcion: t.description,
      categoria: t.category.name,
      monto: parseFloat(t.amount).toFixed(2),
      estado: t.status,
    }))
    analyticsService.exportCsv(rows, `transacciones_${from}_${to}.csv`)
  }

  const MONTH_NAMES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const cashflowData = cashflow.map(c => ({
    mes:      `${MONTH_NAMES_SHORT[c.monthNum - 1]}`,
    Ingresos: c.income,
    Gastos:   c.expenses,
  }))

  if (loadSum) return (
    <div className="space-y-5">
      <PageHeader title="Reportes" description="Análisis financiero basado en datos reales" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  )
  if (summaryError) return (
    <div className="space-y-5">
      <PageHeader title="Reportes" description="Análisis financiero basado en datos reales" />
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-sm font-semibold text-content-primary">No pudimos cargar esta información</p>
        <p className="text-xs text-content-muted">Verifica tu conexión e intenta de nuevo.</p>
        <button onClick={() => refetchSummary()} className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors">
          Reintentar
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      <PageHeader
        title="Reportes"
        description={`Análisis financiero — ${activeWorkspace.name}`}
        actions={
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-base-border text-xs font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-base-elevated border border-base-border">
        {[
          { key: 'resumen',     label: 'Resumen' },
          { key: 'gastos',      label: 'Gastos' },
          { key: 'ingresos',    label: 'Ingresos' },
          { key: 'comparativa', label: 'Comparativa' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
              activeTab === t.key
                ? 'bg-base-surface text-content-primary shadow-sm'
                : 'text-content-muted hover:text-content-primary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'resumen' && summary && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Ingresos',        value: summary.income,        icon: TrendingUp,   color: 'text-emerald-400' },
              { label: 'Gastos',          value: summary.expenses,      icon: TrendingDown, color: 'text-red-400' },
              { label: 'Balance',         value: summary.balance,       icon: Wallet,       color: summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Disponible real', value: summary.availableCash, icon: DollarSign,   color: 'text-brand-400' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">{k.label}</p>
                  <k.icon className={cn('w-4 h-4', k.color)} />
                </div>
                <p className={cn('text-xl font-bold tabular-nums', k.color)}>{formatCurrency(k.value)}</p>
              </div>
            ))}
          </div>

          {/* Métricas adicionales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Tasa de ahorro',   value: summary.savingsRate != null ? `${summary.savingsRate.toFixed(1)}%` : '—',  icon: PiggyBank, color: 'text-emerald-400' },
              { label: 'Comprometido',     value: formatCurrency(summary.committed),     icon: Lock,       color: 'text-amber-400' },
              { label: 'Dinero libre',     value: formatCurrency(summary.freeCash),      icon: ArrowUpDown, color: summary.freeCash >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Deuda total',      value: formatCurrency(summary.totalDebt),     icon: TrendingDown, color: 'text-red-400' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">{k.label}</p>
                  <k.icon className={cn('w-4 h-4', k.color)} />
                </div>
                <p className={cn('text-lg font-bold tabular-nums', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Flujo anual */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-content-primary mb-4">Flujo de caja — {year}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cashflowData} barSize={12} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2547" />
                <XAxis dataKey="mes" tick={{ fill: '#8b7aad', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8b7aad', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#c4b5fd' }} />
                <Bar dataKey="Ingresos" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos"   fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {activeTab === 'gastos' && (
        <>
          {/* Distribución */}
          {loadBrk ? <Skeleton className="h-48" /> : breakdown.length > 0 ? (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-content-primary mb-4">Distribución de gastos por categoría</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={breakdown} dataKey="amount" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {breakdown.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <RCTooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE.contentStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {breakdown.map((item, i) => (
                    <div key={item.categoryId} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="text-xs text-content-secondary flex-1 truncate">{item.categoryName}</span>
                      <span className="text-xs font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                      <span className="text-[10px] text-content-muted w-10 text-right">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-content-muted text-sm">Sin gastos registrados en este período.</Card>
          )}

          {/* Top 10 gastos */}
          {top10Exp.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-base-border">
                <h3 className="text-sm font-semibold text-content-primary">Top gastos del período</h3>
              </div>
              <div className="divide-y divide-base-border">
                {top10Exp.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-content-primary truncate">{t.description}</p>
                      <p className="text-xs text-content-muted">{t.category.name} · {t.transactionDate}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-400 tabular-nums">-{formatCurrency(parseFloat(t.amount))}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === 'ingresos' && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-base-border">
            <h3 className="text-sm font-semibold text-content-primary">Top ingresos del período</h3>
          </div>
          {top10Inc.length === 0 ? (
            <p className="p-8 text-center text-content-muted text-sm">Sin ingresos en este período.</p>
          ) : (
            <div className="divide-y divide-base-border">
              {top10Inc.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-content-primary truncate">{t.description}</p>
                    <p className="text-xs text-content-muted">{t.category.name} · {t.transactionDate}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400 tabular-nums">+{formatCurrency(parseFloat(t.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'comparativa' && comparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CompareCard
            label="Ingresos"
            current={comparison.current.income}
            prev={comparison.previous.income}
            diffAbs={comparison.changes.incomeAbs}
            diffPct={comparison.changes.incomePct}
            colorPositive={true}
          />
          <CompareCard
            label="Gastos"
            current={comparison.current.expenses}
            prev={comparison.previous.expenses}
            diffAbs={comparison.changes.expensesAbs}
            diffPct={comparison.changes.expensesPct}
            colorPositive={false}
          />
          <CompareCard
            label="Balance"
            current={comparison.current.balance}
            prev={comparison.previous.balance}
            diffAbs={comparison.current.balance - comparison.previous.balance}
            diffPct={comparison.previous.balance !== 0 ? ((comparison.current.balance - comparison.previous.balance) / Math.abs(comparison.previous.balance)) * 100 : null}
            colorPositive={true}
          />
          {comparison.previous.from && (
            <p className="col-span-full text-[10px] text-content-disabled">
              Período anterior: {comparison.previous.from} → {comparison.previous.to}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
