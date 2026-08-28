import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard.service'

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function useDashboardSummary(workspaceId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: ['dashboard', 'summary', workspaceId, dateStr(from), dateStr(to)],
    queryFn:  () => dashboardService.summary(workspaceId, dateStr(from), dateStr(to)),
    enabled:  !!workspaceId,
  })
}

export function useCashFlow(workspaceId: string, year: number) {
  return useQuery({
    queryKey: ['dashboard', 'cash-flow', workspaceId, year],
    queryFn:  () => dashboardService.cashFlow(workspaceId, year),
    enabled:  !!workspaceId,
  })
}

export function useExpenseDistribution(workspaceId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: ['dashboard', 'expense-dist', workspaceId, dateStr(from), dateStr(to)],
    queryFn:  () => dashboardService.expenseDistribution(workspaceId, dateStr(from), dateStr(to)),
    enabled:  !!workspaceId,
  })
}
