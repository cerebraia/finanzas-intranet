import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsService } from '@/services/clients.service'
import type { CreateClientInput, CreateClientServiceInput } from '@/types/api'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'

export function useClients(workspaceId: string) {
  return useQuery({
    queryKey: ['clients', workspaceId],
    queryFn:  () => clientsService.list(workspaceId),
    enabled:  !!workspaceId,
  })
}

export function useClient(id: string, workspaceId: string) {
  return useQuery({
    queryKey: ['clients', workspaceId, id],
    queryFn:  () => clientsService.get(id, workspaceId),
    enabled:  !!id && !!workspaceId,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateClientInput) => clientsService.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clients', vars.workspaceId] })
      toast.success('Cliente creado correctamente')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId, data }: { id: string; workspaceId: string; data: Partial<CreateClientInput> & { status?: string } }) =>
      clientsService.update(id, workspaceId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clients', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['clients', vars.workspaceId, vars.id] })
      toast.success('Cliente actualizado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useClientServices(clientId: string, workspaceId: string) {
  return useQuery({
    queryKey: ['client-services', clientId],
    queryFn:  () => clientsService.listServices(clientId, workspaceId),
    enabled:  !!clientId && !!workspaceId,
  })
}

export function useAddClientService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clientId, workspaceId, data }: { clientId: string; workspaceId: string; data: CreateClientServiceInput }) =>
      clientsService.addService(clientId, workspaceId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-services', vars.clientId] })
      qc.invalidateQueries({ queryKey: ['clients', vars.workspaceId] })
      toast.success('Servicio agregado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useArchiveClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      clientsService.archive(id, workspaceId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clients', vars.workspaceId] })
      toast.success('Cliente archivado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      clientsService.delete(id, workspaceId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clients', vars.workspaceId] })
      toast.success('Cliente eliminado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useServiceCatalog(workspaceId: string) {
  return useQuery({
    queryKey: ['service-catalog', workspaceId],
    queryFn:  () => clientsService.listCatalog(workspaceId),
    enabled:  !!workspaceId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useClientReceivables(clientId: string, workspaceId: string) {
  return useQuery({
    queryKey: ['client-receivables', clientId],
    queryFn:  () => clientsService.listReceivables(clientId, workspaceId),
    enabled:  !!clientId,
  })
}

export function useClientPayments(clientId: string, workspaceId: string) {
  return useQuery({
    queryKey: ['client-payments', clientId],
    queryFn:  () => clientsService.listPayments(clientId, workspaceId),
    enabled:  !!clientId,
  })
}

export function useClientProfitability(clientId: string, workspaceId: string) {
  return useQuery({
    queryKey: ['client-profitability', clientId],
    queryFn:  () => clientsService.profitability(clientId, workspaceId),
    enabled:  !!clientId,
  })
}
