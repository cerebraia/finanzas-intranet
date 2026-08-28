/**
 * analytics.service.ts — Fuente única de verdad para todas las métricas financieras.
 * Todos los cálculos se delegan a RPCs de PostgreSQL para garantizar consistencia
 * entre Dashboard, Reportes, Estadísticas y Cierre mensual.
 */
import { supabase } from '@/lib/supabase'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FinancialSummary {
  income:           number
  incomeCount:      number
  expenses:         number
  expensesCount:    number
  balance:          number
  savingsRate:      number | null  // null si ingresos = 0
  pending:          number
  pendingCount:     number
  availableCash:    number
  totalDebt:        number
  committed:        number
  plannedPurchases: number
  freeCash:         number
  projectedFree:    number
}

export interface CashflowPoint {
  monthNum:   number
  monthName:  string
  income:     number
  expenses:   number
  balance:    number
}

export interface ExpenseBreakdownItem {
  categoryId:   string
  categoryName: string
  amount:       number
  percentage:   number
}

export interface PeriodComparison {
  current:  { income: number; expenses: number; balance: number }
  previous: { income: number; expenses: number; balance: number; from: string; to: string }
  changes:  { incomeAbs: number; incomePct: number | null; expensesAbs: number; expensesPct: number | null }
}

export interface BudgetStatus {
  budgetId:       string
  budgetName:     string
  categoryName:   string | null
  budgetAmount:   number
  spent:          number
  remaining:      number
  spentPct:       number
  status:         'SAFE' | 'WARNING' | 'CRITICAL' | 'EXCEEDED'
  alertThreshold: number
  periodFrom:     string
  periodTo:       string
}

export interface GoalProgress {
  goalId:        string
  goalName:      string
  targetAmount:  number
  saved:         number
  remaining:     number
  progressPct:   number
  status:        string
  priority:      string
  targetDate:    string | null
  daysRemaining: number | null
}

export interface ProjectionPoint {
  periodLabel: string
  income:      number
  expenses:    number
  balance:     number
  isProjected: boolean
}

export interface MonthClosePreview {
  year:     number
  month:    number
  summary:  FinancialSummary
  ads:      { billed: number; collected: number; pending: number; expenses: number; operatingProfit: number }
  warnings: { pendingTransactions: number; overdueReceivables: number; overduePayroll: number; overdueDebt: number; hasWarnings: boolean }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const analyticsService = {
  /** Resumen financiero canónico — usar en Dashboard Y Reportes para garantizar consistencia */
  async getFinancialSummary(workspaceId: string, from: string, to: string, currency?: string): Promise<FinancialSummary> {
    const { data, error } = await supabase.rpc('get_financial_summary', {
      p_workspace_id: workspaceId,
      p_from: from,
      p_to:   to,
      ...(currency ? { p_currency: currency } : {}),
    })
    if (error) throw new Error(error.message)
    const r = data as Record<string, number | null>
    return {
      income:           Number(r.income           ?? 0),
      incomeCount:      Number(r.incomeCount       ?? 0),
      expenses:         Number(r.expenses          ?? 0),
      expensesCount:    Number(r.expensesCount      ?? 0),
      balance:          Number(r.balance           ?? 0),
      savingsRate:      r.savingsRate != null ? Number(r.savingsRate) : null,
      pending:          Number(r.pending           ?? 0),
      pendingCount:     Number(r.pendingCount       ?? 0),
      availableCash:    Number(r.availableCash      ?? 0),
      totalDebt:        Number(r.totalDebt          ?? 0),
      committed:        Number(r.committed          ?? 0),
      plannedPurchases: Number(r.plannedPurchases   ?? 0),
      freeCash:         Number(r.freeCash           ?? 0),
      projectedFree:    Number(r.projectedFree      ?? 0),
    }
  },

  /** Monedas activas en el workspace (returns 'USD', 'VES', 'EUR' según cuentas activas) */
  async getWorkspaceCurrencies(workspaceId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_workspace_currencies', {
      p_workspace_id: workspaceId,
    })
    if (error) {
      // Fallback: deduce currencies from accounts table directly
      const { data: accounts } = await supabase
        .from('accounts')
        .select('currency')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
      const currencies = [...new Set((accounts ?? []).map((a: { currency: string }) => a.currency))]
      return currencies.length > 0 ? currencies : ['USD']
    }
    return ((data ?? []) as { currency: string }[]).map(r => r.currency)
  },

  /** Serie mensual de ingresos/gastos para gráficos */
  async getCashflowSeries(workspaceId: string, year: number, currency?: string): Promise<CashflowPoint[]> {
    const { data, error } = await supabase.rpc('get_cashflow_series', {
      p_workspace_id: workspaceId,
      p_year:         year,
      ...(currency ? { p_currency: currency } : {}),
    })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      monthNum:  Number(r.month_num),
      monthName: String(r.month_name),
      income:    Number(r.income   ?? 0),
      expenses:  Number(r.expenses ?? 0),
      balance:   Number(r.balance  ?? 0),
    }))
  },

  /** Distribución de gastos por categoría */
  async getExpenseBreakdown(workspaceId: string, from: string, to: string, currency?: string): Promise<ExpenseBreakdownItem[]> {
    const { data, error } = await supabase.rpc('get_expense_breakdown', {
      p_workspace_id: workspaceId,
      p_from: from,
      p_to:   to,
      ...(currency ? { p_currency: currency } : {}),
    })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      categoryId:   String(r.category_id   ?? ''),
      categoryName: String(r.category_name ?? 'Sin categoría'),
      amount:       Number(r.amount        ?? 0),
      percentage:   Number(r.percentage    ?? 0),
    }))
  },

  /** Comparativa con período anterior */
  async getPeriodComparison(workspaceId: string, from: string, to: string): Promise<PeriodComparison> {
    const { data, error } = await supabase.rpc('get_period_comparison', {
      p_workspace_id: workspaceId,
      p_from: from,
      p_to:   to,
    })
    if (error) throw new Error(error.message)
    const r = data as Record<string, Record<string, number | null>>
    return {
      current:  { income: Number(r.current?.income ?? 0), expenses: Number(r.current?.expenses ?? 0), balance: Number(r.current?.balance ?? 0) },
      previous: { income: Number(r.previous?.income ?? 0), expenses: Number(r.previous?.expenses ?? 0), balance: Number(r.previous?.balance ?? 0), from: String(r.previous?.from ?? ''), to: String(r.previous?.to ?? '') },
      changes:  { incomeAbs: Number(r.changes?.incomeAbs ?? 0), incomePct: r.changes?.incomePct != null ? Number(r.changes.incomePct) : null, expensesAbs: Number(r.changes?.expensesAbs ?? 0), expensesPct: r.changes?.expensesPct != null ? Number(r.changes.expensesPct) : null },
    }
  },

  /** Estado de presupuestos con gasto real */
  async getBudgetStatus(workspaceId: string, from?: string, to?: string): Promise<BudgetStatus[]> {
    const { data, error } = await supabase.rpc('get_budget_status', {
      p_workspace_id: workspaceId,
      p_from: from ?? null,
      p_to:   to   ?? null,
    })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      budgetId:       String(r.budget_id   ?? ''),
      budgetName:     String(r.budget_name ?? ''),
      categoryName:   r.category_name != null ? String(r.category_name) : null,
      budgetAmount:   Number(r.budget_amount  ?? 0),
      spent:          Number(r.spent          ?? 0),
      remaining:      Number(r.remaining      ?? 0),
      spentPct:       Number(r.spent_pct      ?? 0),
      status:         String(r.status         ?? 'SAFE') as BudgetStatus['status'],
      alertThreshold: Number(r.alert_threshold ?? 80),
      periodFrom:     String(r.period_from    ?? ''),
      periodTo:       String(r.period_to      ?? ''),
    }))
  },

  /** Progreso de metas financieras */
  async getGoalProgress(workspaceId: string): Promise<GoalProgress[]> {
    const { data, error } = await supabase.rpc('get_goal_progress', {
      p_workspace_id: workspaceId,
    })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      goalId:        String(r.goal_id      ?? ''),
      goalName:      String(r.goal_name    ?? ''),
      targetAmount:  Number(r.target_amount ?? 0),
      saved:         Number(r.saved         ?? 0),
      remaining:     Number(r.remaining     ?? 0),
      progressPct:   Number(r.progress_pct  ?? 0),
      status:        String(r.status        ?? ''),
      priority:      String(r.priority      ?? ''),
      targetDate:    r.target_date != null ? String(r.target_date) : null,
      daysRemaining: r.days_remaining != null ? Number(r.days_remaining) : null,
    }))
  },

  /** Proyecciones basadas en promedio móvil */
  async getProjections(workspaceId: string, months = 6): Promise<ProjectionPoint[]> {
    const { data, error } = await supabase.rpc('get_projections', {
      p_workspace_id: workspaceId,
      p_months:       months,
    })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      periodLabel: String(r.period_label   ?? ''),
      income:      Number(r.income         ?? 0),
      expenses:    Number(r.expenses       ?? 0),
      balance:     Number(r.balance        ?? 0),
      isProjected: Boolean(r.is_projected),
    }))
  },

  /** Preview del cierre mensual */
  async getMonthClosePreview(workspaceId: string, year: number, month: number): Promise<MonthClosePreview> {
    const { data, error } = await supabase.rpc('get_month_close_preview', {
      p_workspace_id: workspaceId,
      p_year:  year,
      p_month: month,
    })
    if (error) throw new Error(error.message)
    const d = data as Record<string, Record<string, unknown>>
    const s = d.summary as Record<string, unknown>
    return {
      year:  Number(d.year),
      month: Number(d.month),
      summary: {
        income: Number(s.income ?? 0), incomeCount: Number(s.incomeCount ?? 0),
        expenses: Number(s.expenses ?? 0), expensesCount: Number(s.expensesCount ?? 0),
        balance: Number(s.balance ?? 0), savingsRate: s.savingsRate != null ? Number(s.savingsRate) : null,
        pending: Number(s.pending ?? 0), pendingCount: Number(s.pendingCount ?? 0),
        availableCash: Number(s.availableCash ?? 0), totalDebt: Number(s.totalDebt ?? 0),
        committed: Number(s.committed ?? 0), plannedPurchases: Number(s.plannedPurchases ?? 0),
        freeCash: Number(s.freeCash ?? 0), projectedFree: Number(s.projectedFree ?? 0),
      },
      ads: {
        billed:          Number((d.ads as Record<string, unknown>)?.billed ?? 0),
        collected:       Number((d.ads as Record<string, unknown>)?.collected ?? 0),
        pending:         Number((d.ads as Record<string, unknown>)?.pending ?? 0),
        expenses:        Number((d.ads as Record<string, unknown>)?.expenses ?? 0),
        operatingProfit: Number((d.ads as Record<string, unknown>)?.operatingProfit ?? 0),
      },
      warnings: {
        pendingTransactions: Number((d.warnings as Record<string, unknown>)?.pendingTransactions ?? 0),
        overdueReceivables:  Number((d.warnings as Record<string, unknown>)?.overdueReceivables  ?? 0),
        overduePayroll:      Number((d.warnings as Record<string, unknown>)?.overduePayroll       ?? 0),
        overdueDebt:         Number((d.warnings as Record<string, unknown>)?.overdueDebt          ?? 0),
        hasWarnings:         Boolean((d.warnings as Record<string, unknown>)?.hasWarnings),
      },
    }
  },

  /** Ejecutar cierre mensual (solo ADMIN/OWNER) */
  async closeMonth(workspaceId: string, year: number, month: number): Promise<{ closureId: string }> {
    const { data, error } = await supabase.rpc('close_financial_month', {
      p_workspace_id: workspaceId,
      p_year:  year,
      p_month: month,
    })
    if (error) throw new Error(error.message)
    return { closureId: (data as Record<string, string>).closure_id }
  },

  /** Historial de cierres mensuales */
  async listClosures(workspaceId: string): Promise<Array<{ id: string; year: number; month: number; income: number; expenses: number; balance: number; closedAt: string; isReopened: boolean }>> {
    const { data, error } = await supabase
      .from('monthly_closures')
      .select('id, year, month, income, expenses, balance, closed_at, is_reopened')
      .eq('workspace_id', workspaceId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      id:          String(r.id),
      year:        Number(r.year),
      month:       Number(r.month),
      income:      Number(r.income),
      expenses:    Number(r.expenses),
      balance:     Number(r.balance),
      closedAt:    String(r.closed_at),
      isReopened:  Boolean(r.is_reopened),
    }))
  },

  /** Snapshot de un cierre histórico */
  async getClosure(workspaceId: string, year: number, month: number): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('monthly_closures')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('year', year)
      .eq('month', month)
      .single()
    if (error) return null
    return data as Record<string, unknown>
  },

  /** Export CSV helper (client-side) */
  exportCsv(rows: Record<string, unknown>[], filename: string) {
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const lines   = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = r[h]
        const s = v == null ? '' : String(v)
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
      }).join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  },
}
