import { supabase } from '@/lib/supabase'
import type { Reminder, PurchasePriority, ReminderSource, ReminderStatus } from '@/types/purchases'

interface ReminderRow {
  id:            string
  workspace_id:  string | null
  title:         string
  description:   string | null
  source_type:   string
  source_id:     string | null
  reminder_at:   string
  priority:      string
  status:        string
  snoozed_until: string | null
  created_at:    string
  updated_at:    string
  completed_at:  string | null
}

function rowToReminder(row: ReminderRow): Reminder {
  return {
    id:           row.id,
    workspaceId:  row.workspace_id ?? undefined,
    title:        row.title,
    description:  row.description ?? undefined,
    sourceType:   row.source_type as ReminderSource,
    sourceId:     row.source_id   ?? undefined,
    reminderDate: row.reminder_at,
    priority:     row.priority    as PurchasePriority,
    status:       row.status      as ReminderStatus,
    snoozedTo:    row.snoozed_until ?? undefined,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
    completedAt:  row.completed_at ?? undefined,
  }
}

export const remindersService = {
  async list(workspaceId?: string): Promise<Reminder[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
      .from('reminders')
      .select('*')
      .order('reminder_at')

    if (workspaceId) {
      query = query.or(`workspace_id.eq.${workspaceId},and(workspace_id.is.null,created_by.eq.${user.id})`)
    } else {
      query = query.is('workspace_id', null)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return ((data ?? []) as ReminderRow[]).map(rowToReminder)
  },

  async create(input: {
    title:        string
    reminderDate: string
    priority?:    PurchasePriority
    description?: string
    sourceType?:  ReminderSource
    sourceId?:    string
    workspaceId?: string
  }): Promise<Reminder> {
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        title:        input.title,
        reminder_at:  input.reminderDate,
        priority:     input.priority    ?? 'MEDIUM',
        description:  input.description ?? null,
        source_type:  input.sourceType  ?? 'MANUAL',
        source_id:    input.sourceId    ?? null,
        workspace_id: input.workspaceId ?? null,
        status:       'PENDING',
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToReminder(data as ReminderRow)
  },

  async update(id: string, data: Partial<Reminder>): Promise<Reminder> {
    const patch: Record<string, unknown> = {}
    if (data.title       !== undefined) patch.title       = data.title
    if (data.description !== undefined) patch.description = data.description
    if (data.priority    !== undefined) patch.priority    = data.priority
    if (data.status      !== undefined) patch.status      = data.status
    if (data.snoozedTo   !== undefined) patch.snoozed_until = data.snoozedTo
    if (data.completedAt !== undefined) patch.completed_at  = data.completedAt

    const { data: updated, error } = await supabase
      .from('reminders')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToReminder(updated as ReminderRow)
  },

  async complete(id: string): Promise<Reminder> {
    return remindersService.update(id, {
      status:      'COMPLETED',
      completedAt: new Date().toISOString(),
    })
  },

  async dismiss(id: string): Promise<Reminder> {
    return remindersService.update(id, { status: 'DISMISSED' })
  },

  async snooze(id: string, days: number): Promise<Reminder> {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return remindersService.update(id, {
      snoozedTo: d.toISOString().slice(0, 10),
      status:    'PENDING',
    })
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('reminders').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
