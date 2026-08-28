import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesService } from '@/services/employees.service'
import type { CreateEmployeeInput, CreatePayrollRuleInput } from '@/types/api'
import { toast } from 'sonner'

export function useEmployees(workspaceId: string) {
  return useQuery({
    queryKey: ['employees', workspaceId],
    queryFn:  () => employeesService.list(workspaceId),
    enabled:  !!workspaceId,
  })
}

export function useEmployee(id: string, workspaceId: string) {
  return useQuery({
    queryKey: ['employees', workspaceId, id],
    queryFn:  () => employeesService.get(id, workspaceId),
    enabled:  !!id && !!workspaceId,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEmployeeInput) => employeesService.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['employees', vars.workspaceId] })
      toast.success('Miembro del equipo creado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId, data }: { id: string; workspaceId: string; data: Partial<CreateEmployeeInput> & { status?: string } }) =>
      employeesService.update(id, workspaceId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['employees', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['employees', vars.workspaceId, vars.id] })
      toast.success('Miembro actualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAddPayrollRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, workspaceId, data }: { employeeId: string; workspaceId: string; data: CreatePayrollRuleInput }) =>
      employeesService.addPayrollRule(employeeId, workspaceId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['employees', vars.workspaceId] })
      toast.success('Regla de pago actualizada')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useEmployeeObligations(employeeId: string, workspaceId: string) {
  return useQuery({
    queryKey: ['employee-obligations', employeeId],
    queryFn:  () => employeesService.listObligations(employeeId, workspaceId),
    enabled:  !!employeeId,
  })
}

export function useEmployeePayments(employeeId: string, workspaceId: string) {
  return useQuery({
    queryKey: ['employee-payments', employeeId],
    queryFn:  () => employeesService.listPayments(employeeId, workspaceId),
    enabled:  !!employeeId,
  })
}
