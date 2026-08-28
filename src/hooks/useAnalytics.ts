/**
 * useAnalytics.ts — Hooks centralizados para métricas financieras.
 * Usan analyticsService como única fuente de verdad.
 * Dashboard, Reportes y Estadísticas deben usar ESTOS hooks para garantizar cifras consistentes.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'
import { analyticsService } from '@/services/analytics.service'
import { budgetsService, type CreateBudgetInput } from '@/services/budgets.service'
import { goalsService }    from '@/services/goals.service'

function dateStr(d: Date) { return d.toISOString().slice(0, 10) }

// ─── Financial Summary (Dashboard + Reports) ─────────────────────────────────
export function useFinancialSummary(workspaceId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: ['financial-summary', workspaceId, dateStr(from), dateStr(to)],
    queryFn:  () => analyticsService.getFinancialSummary(workspaceId, dateStr(from), dateStr(to)),
    enabled:  !!workspaceId,
  })
}

// ─── Cashflow Series (Statistics + Reports) ───────────────────────────────────
export function useCashflowSeries(workspaceId: string, year: number) {
  return useQuery({
    queryKey: ['cashflow-series', workspaceId, year],
    queryFn:  () => analyticsService.getCashflowSeries(workspaceId, year),
    enabled:  !!workspaceId,
  })
}

// ─── Expense Breakdown ────────────────────────────────────────────────────────
export function useExpenseBreakdown(workspaceId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: ['expense-breakdown', workspaceId, dateStr(from), dateStr(to)],
    queryFn:  () => analyticsService.getExpenseBreakdown(workspaceId, dateStr(from), dateStr(to)),
    enabled:  !!workspaceId,
  })
}

// ─── Period Comparison ────────────────────────────────────────────────────────
export function usePeriodComparison(workspaceId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: ['period-comparison', workspaceId, dateStr(from), dateStr(to)],
    queryFn:  () => analyticsService.getPeriodComparison(workspaceId, dateStr(from), dateStr(to)),
    enabled:  !!workspaceId,
  })
}

// ─── Projections ──────────────────────────────────────────────────────────────
export function useProjections(workspaceId: string, months = 6) {
  return useQuery({
    queryKey: ['projections', workspaceId, months],
    queryFn:  () => analyticsService.getProjections(workspaceId, months),
    enabled:  !!workspaceId,
    staleTime: 1000 * 60 * 10, // 10 min — las proyecciones no cambian frecuentemente
  })
}

// ─── Budgets ──────────────────────────────────────────────────────────────────
export function useBudgets(workspaceId: string) {
  return useQuery({
    queryKey: ['budgets', workspaceId],
    queryFn:  () => budgetsService.list(workspaceId),
    enabled:  !!workspaceId,
  })
}

export function useBudgetStatus(workspaceId: string, from?: Date, to?: Date) {
  return useQuery({
    queryKey: ['budget-status', workspaceId, from ? dateStr(from) : null, to ? dateStr(to) : null],
    queryFn:  () => analyticsService.getBudgetStatus(workspaceId, from ? dateStr(from) : undefined, to ? dateStr(to) : undefined),
    enabled:  !!workspaceId,
  })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBudgetInput) => budgetsService.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['budgets', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['budget-status'] })
      toast.success('Presupuesto creado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useDeactivateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      budgetsService.deactivate(id).then(() => ({ workspaceId })),
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['budgets', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['budget-status'] })
      toast.success('Presupuesto desactivado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

// ─── Goals ────────────────────────────────────────────────────────────────────
export function useGoals(workspaceId: string) {
  return useQuery({
    queryKey: ['goals', workspaceId],
    queryFn:  () => goalsService.list(workspaceId),
    enabled:  !!workspaceId,
  })
}

export function useGoalProgress(workspaceId: string) {
  return useQuery({
    queryKey: ['goal-progress', workspaceId],
    queryFn:  () => analyticsService.getGoalProgress(workspaceId),
    enabled:  !!workspaceId,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof goalsService.create>[0]) => goalsService.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['goals', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['goal-progress'] })
      toast.success('Meta creada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

export function useAddGoalContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof goalsService.addContribution>[0]) =>
      goalsService.addContribution(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['goals', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['goal-progress', vars.workspaceId] })
      toast.success(`Aporte de $${vars.amount.toFixed(2)} registrado`)
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}

// ─── Monthly Closure ──────────────────────────────────────────────────────────
export function useMonthClosePreview(workspaceId: string, year: number, month: number, enabled = true) {
  return useQuery({
    queryKey: ['month-close-preview', workspaceId, year, month],
    queryFn:  () => analyticsService.getMonthClosePreview(workspaceId, year, month),
    enabled:  !!workspaceId && enabled,
  })
}

export function useMonthClosures(workspaceId: string) {
  return useQuery({
    queryKey: ['monthly-closures', workspaceId],
    queryFn:  () => analyticsService.listClosures(workspaceId),
    enabled:  !!workspaceId,
  })
}

export function useCloseMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, year, month }: { workspaceId: string; year: number; month: number }) =>
      analyticsService.closeMonth(workspaceId, year, month),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['monthly-closures', vars.workspaceId] })
      qc.invalidateQueries({ queryKey: ['month-close-preview'] })
      toast.success(`Mes cerrado correctamente`)
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })
}
