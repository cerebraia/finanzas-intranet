import { supabase } from '@/lib/supabase'
import type { CalendarEvent } from '@/mocks/calendar.mock'

interface CalendarRow {
  id:          string
  title:       string
  amount:      number
  event_type:  string
  day:         number
  month:       number
  year:        number
  status:      string
  description: string
}

// Mapear event_type de DB → CalendarEventType de la UI
const EVENT_TYPE_MAP: Record<string, string> = {
  client:   'client',
  payroll:  'payroll',
  fixed:    'fixed',
  debt:     'debt',
  purchase: 'purchase',
  reminder: 'reminder',
  income:   'income',
  expense:  'expense',
}

function rowToEvent(row: CalendarRow, month: number, year: number): CalendarEvent {
  return {
    id:          row.id,
    title:       row.title,
    amount:      Number(row.amount),
    type:        (EVENT_TYPE_MAP[row.event_type] ?? 'expense') as CalendarEvent['type'],
    day:         row.day,
    month:       month,
    year:        year,
    status:      row.status as CalendarEvent['status'],
    description: row.description,
  }
}

export const calendarService = {
  async getEvents(workspaceId: string, month: number, year: number): Promise<CalendarEvent[]> {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('get_calendar_events', {
      p_workspace_id: workspaceId,
      p_month:        month,
      p_year:         year,
      p_user_id:      user?.id ?? null,
    })

    if (error) throw new Error(error.message)
    return ((data ?? []) as CalendarRow[]).map(row => rowToEvent(row, month, year))
  },
}
