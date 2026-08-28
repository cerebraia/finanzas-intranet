import { supabase } from '@/lib/supabase'
import { analyticsService } from '@/services/analytics.service'
import type { DashboardSummary, CashFlowPoint, ExpenseDistributionItem } from '@/types/api'

// dashboard.service.ts delegates to the canonical analytics RPCs.
// This avoids parallel balance implementations between Dashboard and Reports.

export const dashboardService = {
  async summary(workspaceId: string, from: string, to: string): Promise<DashboardSummary> {
    const summary = await analyticsService.getFinancialSummary(workspaceId, from, to)
    return {
      income:    { total: summary.income,    count: summary.incomeCount },
      expenses:  { total: summary.expenses,  count: summary.expensesCount },
      balance:   summary.balance,
      pending:   { total: summary.pending,   count: summary.pendingCount },
      available: summary.availableCash,
      committed: summary.committed,
      projection: summary.availableCash - summary.committed,
    }
  },

  async cashFlow(workspaceId: string, year: number): Promise<CashFlowPoint[]> {
    const { data, error } = await supabase.rpc('get_cashflow_series', {
      p_workspace_id: workspaceId,
      p_year: year,
    })
    if (error) throw new Error(error.message)

    const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
    return ((data ?? []) as { month_num: number; income: number; expenses: number }[]).map(r => ({
      month:    months[r.month_num - 1],
      income:   r.income,
      expenses: r.expenses,
    }))
  },

  async expenseDistribution(workspaceId: string, from: string, to: string): Promise<ExpenseDistributionItem[]> {
    const { data, error } = await supabase.rpc('get_expense_breakdown', {
      p_workspace_id: workspaceId,
      p_from: from,
      p_to: to,
    })
    if (error) throw new Error(error.message)

    const palette = ['#8b5cf6','#a78bfa','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#c4b5fd','#ddd6fe']
    return ((data ?? []) as { category_name: string; amount: number; percentage: number }[]).map((r, i) => ({
      name:       r.category_name,
      value:      r.amount,
      color:      palette[i % palette.length],
      percentage: r.percentage,
    }))
  },
}
