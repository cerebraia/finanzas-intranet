import {
  TrendingUp, TrendingDown, Wallet, CircleDollarSign,
  Eye, EyeOff, Zap, AlertCircle, AlertTriangle,
} from 'lucide-react'
import { useWorkspace }       from '@/context/WorkspaceContext'
import { useApp }             from '@/context/AppContext'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { usePendingItems }    from '@/hooks/usePendingItems'
import { usePurchases, useReminders } from '@/hooks/usePurchases'
import { useAnnualGoalsFocus, useAnnualGoals } from '@/hooks/useAnnualGoals'
import { useAccounts }        from '@/hooks/useAccounts'
import { formatCurrency, getGreeting } from '@/lib/utils'
import { maskAmount }         from '@/lib/privacy'
import { cn }                 from '@/lib/utils'
import {
  FinancialStatusBar,
  ResolveSection,
  Next7DaysWidget,
  MonthPlanWidget,
  YearProgressWidget,
  AnnualGoalsWidget,
  AccountsWidget,
  QuickActions,
  CashFlowChart,
  ExpenseDistributionChart,
} from '@/components/dashboard'
import type { KpiMetric, CashFlowData, ExpenseCategory } from '@/types'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { useCashFlow, useExpenseDistribution } from '@/hooks/useDashboard'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function PersonalDashboard() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const { focusMode, toggleFocus, privacyMode, togglePrivacy } = useApp()
  const wsId = activeWorkspace.id
  const year = dateRange.from.getFullYear()
  const month = dateRange.from.getMonth()

  const currentMonth = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthLabel   = `${MONTH_NAMES[month]} ${year}`

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } =
    useDashboardSummary(wsId, dateRange.from, dateRange.to)

  const { data: cashFlow } = useCashFlow(wsId, year)
  const { data: expDist  } = useExpenseDistribution(wsId, dateRange.from, dateRange.to)

  const { data: pendingItems = [] } = usePendingItems(wsId, { limit: 50 })
  const { items: purchases }        = usePurchases()
  const { items: reminders, complete: completeReminder } = useReminders()
  const { data: focusGoals = [] }   = useAnnualGoalsFocus()
  const { summary: yearSummary }    = useAnnualGoals(year)
  const { data: accounts = [] }     = useAccounts(wsId)

  // ─── Derived ────────────────────────────────────────────────────────────────
  const freeCash = summary ? summary.available - summary.committed : 0

  const kpis: KpiMetric[] = summary
    ? [
        { id: 'available', label: 'Disponible',       value: maskAmount(formatCurrency(summary.available), privacyMode), icon: Wallet,           colorVariant: 'default' },
        { id: 'income',    label: 'Ingresos del mes',  value: maskAmount(formatCurrency(summary.income.total), privacyMode), icon: TrendingUp,  trend: 'up',   trendValue: `${summary.income.count} movs`,  colorVariant: 'success' },
        { id: 'expenses',  label: 'Gastos del mes',    value: maskAmount(formatCurrency(summary.expenses.total), privacyMode), icon: TrendingDown, trend: 'down', trendValue: `${summary.expenses.count} movs`, colorVariant: 'danger' },
        { id: 'free',      label: 'Dinero libre',      value: maskAmount(formatCurrency(freeCash), privacyMode), icon: CircleDollarSign, colorVariant: freeCash >= 0 ? 'success' : 'danger', subtitle: `Comprometido: ${maskAmount(formatCurrency(summary.committed), privacyMode)}` },
      ]
    : []

  const accountsForWidget = accounts.map(a => ({
    id:          a.id,
    name:        a.name,
    balance:     privacyMode ? 0 : a.currentBalance,
    type:        a.type.toLowerCase() as 'bank' | 'digital' | 'cash' | 'crypto',
    workspaceId: a.workspaceId,
  }))

  const chartCashFlow: CashFlowData[] = (cashFlow ?? []).map(c => ({ month: c.month, income: c.income, expenses: c.expenses }))
  const chartExpDist: ExpenseCategory[] = (expDist ?? []).map(e => ({ name: e.name, value: e.value, color: e.color }))

  // ─── Pending summary ─────────────────────────────────────────────────────────
  const overdueCount = pendingItems.filter(i => i.status === 'OVERDUE').length

  // ─── Error state (summary is the core — if it fails, show full error) ────────
  if (summaryError) {
    if (import.meta.env.DEV) {
      console.error('[Dashboard] summary error', summaryError)
    }
    return (
      <div className="space-y-5 pb-20 md:pb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-content-primary">{getGreeting()}, Fernando!</h1>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-content-primary">No pudimos cargar tu centro de control</p>
          <p className="text-xs text-content-muted">Verifica tu conexión o intenta de nuevo.</p>
          <button
            onClick={() => refetchSummary()}
            className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-20 md:pb-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-content-primary">{getGreeting()}, Fernando!</h1>
          <p className="text-sm text-content-muted mt-0.5">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Privacy toggle */}
          <button
            onClick={togglePrivacy}
            title={privacyMode ? 'Mostrar montos' : 'Ocultar montos'}
            className={cn(
              'p-2 rounded-lg border transition-all',
              privacyMode
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'border-base-border text-content-muted hover:text-content-primary hover:bg-base-hover'
            )}
          >
            {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {/* Focus mode */}
          <button
            onClick={toggleFocus}
            title={focusMode ? 'Salir de modo enfoque' : 'Modo enfoque'}
            className={cn(
              'p-2 rounded-lg border transition-all',
              focusMode
                ? 'bg-brand-600/15 border-brand-600/30 text-brand-400'
                : 'border-base-border text-content-muted hover:text-content-primary hover:bg-base-hover'
            )}
          >
            <Zap className="w-4 h-4" />
          </button>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600/10 border border-brand-600/20">
            <span className="text-base leading-none">{activeWorkspace.emoji}</span>
            <span className="text-xs font-semibold text-brand-400">{activeWorkspace.name}</span>
          </div>
        </div>
      </div>

      {/* ── Alertas rápidas ─────────────────────────────────────── */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm font-medium text-red-400">
            Tienes {overdueCount} obligacion{overdueCount !== 1 ? 'es' : ''} vencida{overdueCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* ── Semáforo financiero ─────────────────────────────────── */}
      {summary && !summaryLoading && (
        <FinancialStatusBar
          available={summary.available}
          committed={summary.committed}
          freeCash={freeCash}
        />
      )}

      {/* ── KPIs ────────────────────────────────────────────────── */}
      {kpis.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(m => <KpiCard key={m.id} metric={m} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-base-border bg-base-surface p-5 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Modo enfoque ────────────────────────────────────────── */}
      {focusMode && summary && (
        <div className="rounded-xl border border-brand-600/30 bg-brand-600/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-brand-400" />
            <p className="text-sm font-semibold text-brand-400">Modo Enfoque</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Disponible', value: maskAmount(formatCurrency(summary.available), privacyMode), color: 'text-emerald-400' },
              { label: 'Libre',      value: maskAmount(formatCurrency(freeCash), privacyMode),           color: freeCash >= 0 ? 'text-brand-400' : 'text-red-400' },
              { label: 'Comprometido', value: maskAmount(formatCurrency(summary.committed), privacyMode), color: 'text-amber-400' },
            ].map(k => (
              <div key={k.label}>
                <p className="text-[10px] text-content-muted mb-0.5">{k.label}</p>
                <p className={cn('text-lg font-bold tabular-nums', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lo que tengo que resolver ───────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-content-muted uppercase tracking-wider mb-3">
          Lo que tengo que resolver
        </h2>
        <ResolveSection
          pendingItems={pendingItems}
          purchases={purchases}
          reminders={reminders}
          privacyMode={privacyMode}
          onComplete={completeReminder}
        />
      </section>

      {/* ── Grid: 7 días + Plan del mes ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Next7DaysWidget
          pendingItems={pendingItems}
          privacyMode={privacyMode}
        />
        {summary && (
          <MonthPlanWidget
            summary={summary}
            purchases={purchases}
            privacyMode={privacyMode}
            currentMonth={currentMonth}
          />
        )}
      </div>

      {/* ── Mis prioridades + Mi año ─────────────────────────────── */}
      {!focusMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnnualGoalsWidget />
          <YearProgressWidget summary={yearSummary} year={year} />
        </div>
      )}

      {/* En modo enfoque solo Mis prioridades */}
      {focusMode && focusGoals.length > 0 && (
        <AnnualGoalsWidget />
      )}

      {/* ── Cuentas ─────────────────────────────────────────────── */}
      <AccountsWidget accounts={accountsForWidget} />

      {/* ── Gráficas — ocultas en modo enfoque ──────────────────── */}
      {!focusMode && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <CashFlowChart
                data={chartCashFlow.length > 0
                  ? chartCashFlow
                  : Array.from({ length: 12 }, (_, i) => ({
                      month: ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][i],
                      income: 0, expenses: 0,
                    }))
                }
              />
            </div>
            <ExpenseDistributionChart data={chartExpDist} />
          </div>
        </>
      )}

      {/* ── Acciones rápidas ────────────────────────────────────── */}
      <QuickActions />
    </div>
  )
}
