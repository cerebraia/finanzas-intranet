import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { debtsService } from '@/services/debts.service'
import type { CreateDebtInput, RegisterDebtPaymentInput } from '@/types/api'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'

export function useDebts(workspaceId: string, type?: string) {
  return useQuery({
    queryKey: ['debts', workspaceId, type],
    queryFn:  () => debtsService.list(workspaceId, type),
    enabled:  !!workspaceId,
  })
}

export function useDebt(id: string, workspaceId: string) {
  return useQuery({
    queryKey: ['debts', workspaceId, id],
    queryFn:  () => debtsService.get(id, workspaceId),
    enabled:  !!id && !!workspaceId,
  })
}

export function useCreateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDebtInput) => debtsService.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['debts', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      qc.invalidateQueries({ queryKey: ['commitment-summary'] })
      toast.success('Deuda creada con cuotas generadas')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useUpdateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId, data }: { id: string; workspaceId: string; data: Parameters<typeof debtsService.update>[2] }) =>
      debtsService.update(id, workspaceId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['debts', vars.workspaceId] })
      toast.success('Deuda actualizada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useRegisterDebtPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ installmentId, data }: { installmentId: string; data: RegisterDebtPaymentInput }) =>
      debtsService.registerPayment(installmentId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['debts', vars.data.workspaceId] })
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      qc.invalidateQueries({ queryKey: ['commitment-summary'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts', vars.data.workspaceId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['financial-summary'] })
      qc.invalidateQueries({ queryKey: ['expense-breakdown'] })
      toast.success('Pago de cuota registrado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useArchiveDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      debtsService.archive(id, workspaceId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['debts', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      qc.invalidateQueries({ queryKey: ['commitment-summary'] })
      toast.success('Deuda archivada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useDeleteDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      debtsService.delete(id, workspaceId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['debts', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      qc.invalidateQueries({ queryKey: ['commitment-summary'] })
      toast.success('Deuda eliminada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useCommitmentSummary(workspaceId: string) {
  return useQuery({
    queryKey: ['commitment-summary', workspaceId],
    queryFn:  () => debtsService.commitmentSummary(workspaceId),
    enabled:  !!workspaceId,
  })
}
