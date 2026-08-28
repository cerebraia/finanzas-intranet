import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'
import { annualGoalsService } from '@/services/annualGoals.service'
import { useWorkspace } from '@/context/WorkspaceContext'
import type { AnnualGoalStatus } from '@/types/annualGoals'

// ─── Annual Goals ─────────────────────────────────────────────────────────────

export function useAnnualGoals(year: number) {
  const qc = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const goalsQuery = useQuery({
    queryKey: ['annual-goals', wsId, year],
    queryFn:  () => annualGoalsService.list(wsId, year),
    enabled:  !!wsId,
  })

  const summaryQuery = useQuery({
    queryKey: ['annual-goals-summary', wsId, year],
    queryFn:  () => annualGoalsService.getSummary(wsId, year),
    enabled:  !!wsId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['annual-goals', wsId, year] })
    qc.invalidateQueries({ queryKey: ['annual-goals-summary', wsId, year] })
    qc.invalidateQueries({ queryKey: ['annual-goals-focus', wsId] })
  }

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof annualGoalsService.create>[0]) =>
      annualGoalsService.create(data),
    onSuccess: () => { invalidate(); toast.success('Meta creada') },
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof annualGoalsService.update>[1] }) =>
      annualGoalsService.update(id, data),
    onSuccess: () => { invalidate(); toast.success('Meta actualizada') },
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => annualGoalsService.completeGoal(id),
    onSuccess: () => { invalidate(); toast.success('¡Meta completada!') },
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, progress, status }: { id: string; progress: number; status?: AnnualGoalStatus }) =>
      annualGoalsService.updateProgress(id, progress, status),
    onSuccess: () => { invalidate() },
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => annualGoalsService.delete(id),
    onSuccess: () => { invalidate(); toast.success('Meta eliminada') },
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  return {
    goals:      goalsQuery.data    ?? [],
    summary:    summaryQuery.data  ?? null,
    isLoading:  goalsQuery.isLoading,
    create:     (data: Parameters<typeof annualGoalsService.create>[0]) =>
                  createMutation.mutateAsync(data),
    update:     (id: string, data: Parameters<typeof annualGoalsService.update>[1]) =>
                  updateMutation.mutateAsync({ id, data }),
    complete:   (id: string) => completeMutation.mutateAsync(id),
    updateProgress: (id: string, progress: number, status?: AnnualGoalStatus) =>
                  updateProgressMutation.mutateAsync({ id, progress, status }),
    remove:     (id: string) => deleteMutation.mutate(id),
    refresh:    invalidate,
  }
}

// ─── Focus Goals (for Dashboard widget) ──────────────────────────────────────

export function useAnnualGoalsFocus() {
  const { activeWorkspace } = useWorkspace()
  const wsId  = activeWorkspace.id
  const year  = new Date().getFullYear()

  return useQuery({
    queryKey: ['annual-goals-focus', wsId, year],
    queryFn:  () => annualGoalsService.listFocus(wsId, year),
    enabled:  !!wsId,
  })
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export function useMilestones(goalId: string, workspaceId: string, year: number) {
  const qc = useQueryClient()

  const milestonesQuery = useQuery({
    queryKey: ['annual-goal-milestones', goalId],
    queryFn:  () => annualGoalsService.listMilestones(goalId),
    enabled:  !!goalId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['annual-goal-milestones', goalId] })
    qc.invalidateQueries({ queryKey: ['annual-goals', workspaceId, year] })
    qc.invalidateQueries({ queryKey: ['annual-goals-summary', workspaceId, year] })
  }

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof annualGoalsService.createMilestone>[0]) =>
      annualGoalsService.createMilestone(data),
    onSuccess: () => { invalidate(); toast.success('Hito agregado') },
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: (milestoneId: string) => annualGoalsService.toggleMilestone(milestoneId),
    onSuccess: () => invalidate(),
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (milestoneId: string) => annualGoalsService.deleteMilestone(milestoneId),
    onSuccess: () => { invalidate(); toast.success('Hito eliminado') },
    onError:   (err: Error) => toast.error(mapSupabaseError(err)),
  })

  return {
    milestones: milestonesQuery.data ?? [],
    isLoading:  milestonesQuery.isLoading,
    create:     (data: Parameters<typeof annualGoalsService.createMilestone>[0]) =>
                  createMutation.mutateAsync(data),
    toggle:     (milestoneId: string) => toggleMutation.mutate(milestoneId),
    remove:     (milestoneId: string) => deleteMutation.mutate(milestoneId),
  }
}
