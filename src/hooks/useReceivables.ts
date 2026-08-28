import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { receivablesService } from '@/services/receivables.service'
import type { RegisterPaymentInput } from '@/types/api'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'

export function useReceivables(workspaceId: string, params?: { from?: string; to?: string; clientId?: string; status?: string }) {
  return useQuery({
    queryKey: ['receivables', workspaceId, params],
    queryFn:  () => receivablesService.list(workspaceId, params),
    enabled:  !!workspaceId,
  })
}

export function useRegisterPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ receivableId, data }: { receivableId: string; data: RegisterPaymentInput }) =>
      receivablesService.registerPayment(receivableId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['client-receivables'] })
      qc.invalidateQueries({ queryKey: ['client-payments'] })
      qc.invalidateQueries({ queryKey: ['client-profitability'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['accounts', vars.data.workspaceId] })
      qc.invalidateQueries({ queryKey: ['business'] })
      toast.success('Pago registrado correctamente')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useGenerateReceivables() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, month, year }: { workspaceId: string; month: number; year: number }) =>
      receivablesService.generateMonthly(workspaceId, month, year),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['receivables'] })
      toast.success(`${data.created.length} cobros generados. ${data.skipped.length} omitidos.`)
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}
