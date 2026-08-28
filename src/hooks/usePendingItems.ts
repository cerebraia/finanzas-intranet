import { useQuery } from '@tanstack/react-query'
import { pendingItemsService } from '@/services/pendingItems.service'
import type { PendingItemSourceType } from '@/types/api'

export function usePendingItems(workspaceId: string, options?: {
  limit?: number
  types?: PendingItemSourceType[]
}) {
  return useQuery({
    queryKey: ['pending-items', workspaceId, options],
    queryFn:  () => pendingItemsService.list(workspaceId, options?.limit, options?.types),
    enabled:  !!workspaceId,
  })
}
