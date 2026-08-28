import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recurringExpensesService } from '@/services/recurringExpenses.service'
import type { CreateRecurringExpenseInput } from '@/types/api'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'

export function useRecurringExpenses(workspaceId: string) {
  return useQuery({
    queryKey: ['recurring-expenses', workspaceId],
    queryFn:  () => recurringExpensesService.list(workspaceId),
    enabled:  !!workspaceId,
  })
}

export function useCreateRecurringExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRecurringExpenseInput) => recurringExpensesService.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['recurring-expenses', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      toast.success('Gasto fijo creado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useUpdateRecurringExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId, data }: { id: string; workspaceId: string; data: Partial<CreateRecurringExpenseInput> & { isActive?: boolean } }) =>
      recurringExpensesService.update(id, workspaceId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['recurring-expenses', vars.workspaceId] })
      toast.success('Gasto fijo actualizado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function usePayRecurringExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId, data }: {
      id: string
      workspaceId: string
      data: { month: number; year: number; accountId: string; paymentDate: string; reference?: string }
    }) => recurringExpensesService.pay(id, workspaceId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['recurring-expenses', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['commitment-summary'] })
      qc.invalidateQueries({ queryKey: ['financial-summary'] })
      qc.invalidateQueries({ queryKey: ['expense-breakdown'] })
      toast.success('Pago registrado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useToggleRecurringExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive, workspaceId: _wsId }: { id: string; isActive: boolean; workspaceId: string }) =>
      recurringExpensesService.toggleActive(id, isActive),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['recurring-expenses', vars.workspaceId] })
      toast.success(vars.isActive ? 'Gasto fijo activado' : 'Gasto fijo desactivado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useDeleteRecurringExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId: _wsId }: { id: string; workspaceId: string }) =>
      recurringExpensesService.delete(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['recurring-expenses', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      toast.success('Gasto fijo eliminado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useGenerateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, month, year }: { workspaceId: string; month: number; year: number }) =>
      recurringExpensesService.generate(workspaceId, month, year),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      toast.success(`${data.created.length} obligaciones generadas. ${data.skipped.length} omitidas.`)
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}
