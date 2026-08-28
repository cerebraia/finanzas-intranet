import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsService } from '@/services/transactions.service'
import type { CreateTransactionInput, UpdateTransactionInput, TransactionType, TransactionStatus } from '@/types/api'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'

interface UseTransactionsParams {
  workspaceId: string
  from?: string
  to?: string
  type?: TransactionType
  categoryId?: string
  accountId?: string
  status?: TransactionStatus
  q?: string
}

export function useTransactions(params: UseTransactionsParams) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn:  () => transactionsService.list(params),
    enabled:  !!params.workspaceId,
  })
}

function invalidateFinancials(qc: ReturnType<typeof useQueryClient>, workspaceId: string) {
  qc.invalidateQueries({ queryKey: ['transactions'] })
  qc.invalidateQueries({ queryKey: ['dashboard'] })
  qc.invalidateQueries({ queryKey: ['accounts', workspaceId] })
  qc.invalidateQueries({ queryKey: ['financial-summary'] })
  qc.invalidateQueries({ queryKey: ['cashflow-series'] })
  qc.invalidateQueries({ queryKey: ['expense-breakdown'] })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTransactionInput) => transactionsService.create(data),
    onSuccess: (_, vars) => {
      invalidateFinancials(qc, vars.workspaceId)
      toast.success('Movimiento registrado correctamente')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId, data }: { id: string; workspaceId: string; data: UpdateTransactionInput }) =>
      transactionsService.update(id, workspaceId, data),
    onSuccess: (_, vars) => {
      invalidateFinancials(qc, vars.workspaceId)
      toast.success('Movimiento actualizado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useCancelTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      transactionsService.cancel(id, workspaceId),
    onSuccess: (_, vars) => {
      invalidateFinancials(qc, vars.workspaceId)
      toast.success('Movimiento anulado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}
