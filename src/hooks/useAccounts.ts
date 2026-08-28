import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService } from '@/services/accounts.service'
import type { CreateAccountInput } from '@/types/api'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'

export function useAccounts(workspaceId: string) {
  return useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn:  () => accountsService.list(workspaceId),
    enabled:  !!workspaceId,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAccountInput) => accountsService.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['accounts', vars.workspaceId] })
      toast.success('Cuenta creada correctamente')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useDeactivateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId: _wsId }: { id: string; workspaceId: string }) =>
      accountsService.deactivate(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['accounts', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Cuenta desactivada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}
