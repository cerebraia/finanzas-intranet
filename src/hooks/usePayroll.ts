import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollService } from '@/services/payroll.service'
import type { RegisterPayrollPaymentInput } from '@/types/api'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'

function dateStr(d: Date) { return d.toISOString().slice(0, 10) }

export function usePayrollObligations(workspaceId: string, params?: { from?: string; to?: string; status?: string; employeeId?: string }) {
  return useQuery({
    queryKey: ['payroll-obligations', workspaceId, params],
    queryFn:  () => payrollService.listObligations(workspaceId, params),
    enabled:  !!workspaceId,
  })
}

export function usePayrollSummary(workspaceId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: ['payroll-summary', workspaceId, dateStr(from), dateStr(to)],
    queryFn:  () => payrollService.summary(workspaceId, dateStr(from), dateStr(to)),
    enabled:  !!workspaceId,
  })
}

export function useRegisterPayrollPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ obligationId, data }: { obligationId: string; data: RegisterPayrollPaymentInput }) =>
      payrollService.registerPayment(obligationId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['payroll-obligations'] })
      qc.invalidateQueries({ queryKey: ['payroll-summary'] })
      qc.invalidateQueries({ queryKey: ['employee-obligations'] })
      qc.invalidateQueries({ queryKey: ['employee-payments'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['accounts', vars.data.workspaceId] })
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      qc.invalidateQueries({ queryKey: ['commitment-summary'] })
      qc.invalidateQueries({ queryKey: ['financial-summary'] })
      qc.invalidateQueries({ queryKey: ['expense-breakdown'] })
      toast.success('Pago de nómina registrado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useGeneratePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, month, year }: { workspaceId: string; month: number; year: number }) =>
      payrollService.generate(workspaceId, month, year),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['payroll-obligations'] })
      qc.invalidateQueries({ queryKey: ['pending-items'] })
      toast.success(`${data.created.length} obligaciones generadas. ${data.skipped.length} omitidas.`)
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}
