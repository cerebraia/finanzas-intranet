import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'
import { purchasesService } from '@/services/purchases.service'
import { remindersService }  from '@/services/reminders.service'
import { useWorkspace }      from '@/context/WorkspaceContext'
import { useAuth }           from '@/context/AuthContext'
import type { PurchaseItem, Reminder, PurchasePriority, ReminderSource } from '@/types/purchases'

// ─── PurchaseItems ────────────────────────────────────────────────────────────

export function usePurchases() {
  const qc = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id || undefined

  const query = useQuery({
    queryKey: ['purchases', wsId],
    queryFn:  () => purchasesService.list(wsId),
    enabled:  true,
  })

  const items = query.data ?? []

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof purchasesService.create>[0]) =>
      purchasesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      toast.success('Compra agregada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PurchaseItem> }) =>
      purchasesService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const markPurchasedMutation = useMutation({
    mutationFn: ({ id, transactionId }: { id: string; transactionId?: string }) =>
      purchasesService.markPurchased(id, transactionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      toast.success('Compra marcada como realizada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => purchasesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      toast.success('Compra eliminada')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })

  return {
    items,
    isLoading: query.isLoading,
    // Alias con la misma firma que usaba el hook anterior
    create:       (data: Parameters<typeof purchasesService.create>[0]) =>
      createMutation.mutateAsync(data),
    update:       (id: string, data: Partial<PurchaseItem>) =>
      updateMutation.mutate({ id, data }),
    markPurchased:(id: string, transactionId?: string) =>
      markPurchasedMutation.mutate({ id, transactionId }),
    remove:       (id: string) => removeMutation.mutate(id),
    refresh:      () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  }
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export function useReminders() {
  const qc = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const { user } = useAuth()
  const wsId = activeWorkspace.id || undefined

  const query = useQuery({
    queryKey: ['reminders', wsId, user?.id],
    queryFn:  () => remindersService.list(wsId),
    enabled:  !!user,
  })

  const items = query.data ?? []

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string; reminderDate: string; priority?: PurchasePriority
      description?: string; sourceType?: ReminderSource; sourceId?: string; workspaceId?: string
    }) => remindersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      toast.success('Recordatorio creado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => remindersService.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      toast.success('Recordatorio completado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const dismissMutation = useMutation({
    mutationFn: (id: string) => remindersService.dismiss(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const snoozeMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) =>
      remindersService.snooze(id, days),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      const label = vars.days === 1 ? 'para mañana' : `${vars.days} días`
      toast.success(`Recordatorio pospuesto ${label}`)
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => remindersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      toast.success('Recordatorio eliminado')
    },
    onError: (err: Error) => toast.error(mapSupabaseError(err)),
  })

  const today   = new Date().toISOString().slice(0, 10)
  const pending = items.filter(r => {
    if (r.status !== 'PENDING') return false
    const effective = r.snoozedTo ?? r.reminderDate
    return effective <= today
  })

  return {
    items,
    pending,
    isLoading: query.isLoading,
    create:   (data: Parameters<typeof createMutation.mutate>[0]) =>
      createMutation.mutateAsync(data),
    update:   (id: string, data: Partial<Reminder>) =>
      remindersService.update(id, data).then(() => qc.invalidateQueries({ queryKey: ['reminders'] })),
    complete: (id: string) => completeMutation.mutate(id),
    dismiss:  (id: string) => dismissMutation.mutate(id),
    snooze:   (id: string, days: number) => snoozeMutation.mutate({ id, days }),
    remove:   (id: string) => removeMutation.mutate(id),
    refresh:  () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  }
}
