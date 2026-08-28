import { useQuery } from '@tanstack/react-query'
import { categoriesService } from '@/services/categories.service'
import type { CategoryType } from '@/types/api'

export function useCategories(workspaceId?: string, type?: CategoryType) {
  return useQuery({
    queryKey: ['categories', workspaceId, type],
    queryFn:  () => categoriesService.list(workspaceId, type),
    staleTime: 1000 * 60 * 5,
  })
}
