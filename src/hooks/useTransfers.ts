import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transfersService, type RegisterTransferInput } from '@/services/transfers.service'
import { mapSupabaseError } from '@/lib/errorMap'
import { toast } from 'sonner'

export function useTransfers(workspaceId: string) {
  return useQuery({
    queryKey: ['transfers', workspaceId],
    queryFn:  () => transfersService.list(workspaceId),
    enabled:  !!workspaceId,
  })
}

export function useRegisterTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RegisterTransferInput) => transfersService.register(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['transfers', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['accounts', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transferencia registrada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useCancelTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, transferId }: { workspaceId: string; transferId: string }) =>
      transfersService.cancel(workspaceId, transferId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['transfers', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['accounts', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transferencia anulada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}
