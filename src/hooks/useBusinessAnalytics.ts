import { useQuery } from '@tanstack/react-query'
import { businessAnalyticsService } from '@/services/businessAnalytics.service'

function dateStr(d: Date) { return d.toISOString().slice(0, 10) }

export function useBusinessDashboard(workspaceId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: ['business', 'dashboard', workspaceId, dateStr(from), dateStr(to)],
    queryFn:  () => businessAnalyticsService.dashboard(workspaceId, dateStr(from), dateStr(to)),
    enabled:  !!workspaceId,
  })
}

export function usePendingReceivables(workspaceId: string, limit = 5) {
  return useQuery({
    queryKey: ['business', 'pending', workspaceId],
    queryFn:  () => businessAnalyticsService.pendingReceivables(workspaceId, limit),
    enabled:  !!workspaceId,
  })
}
