import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'
import { businessServicesService } from '@/services/businessServices.service'
import { useWorkspace } from '@/context/WorkspaceContext'

export function useBusinessServices(includeInactive = false) {
  const qc = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const query = useQuery({
    queryKey: ['business-services', wsId, includeInactive],
    queryFn:  () => businessServicesService.list(wsId, includeInactive),
    enabled:  !!wsId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['business-services', wsId] })

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof businessServicesService.create>[0]) =>
      businessServicesService.create(data),
    onSuccess: () => { invalidate(); toast.success('Servicio creado') },
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof businessServicesService.update>[1] }) =>
      businessServicesService.update(id, data),
    onSuccess: () => { invalidate(); toast.success('Servicio actualizado') },
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      businessServicesService.toggleActive(id, isActive),
    onSuccess: () => invalidate(),
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  return {
    services:   query.data ?? [],
    isLoading:  query.isLoading,
    create:     (data: Parameters<typeof businessServicesService.create>[0]) =>
                  createMutation.mutateAsync(data),
    update:     (id: string, data: Parameters<typeof businessServicesService.update>[1]) =>
                  updateMutation.mutateAsync({ id, data }),
    toggle:     (id: string, isActive: boolean) => toggleMutation.mutate({ id, isActive }),
    refresh:    invalidate,
  }
}
