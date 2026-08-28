// Mock de eventos financieros del calendario — Hito 7
// Generados a partir de los datos seed del proyecto

export type CalendarEventType = 'income' | 'expense' | 'payroll' | 'debt' | 'client' | 'fixed' | 'purchase' | 'reminder'

export interface CalendarEvent {
  id:          string
  title:       string
  amount:      number
  type:        CalendarEventType
  day:         number   // 1-31
  month:       number   // 1-12
  year:        number
  status:      'pending' | 'paid' | 'overdue'
  description: string
}

const TYPE_COLOR: Record<CalendarEventType, string> = {
  income:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  expense:  'bg-red-500/15 text-red-400 border-red-500/30',
  payroll:  'bg-brand-600/15 text-brand-400 border-brand-600/30',
  debt:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  client:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  fixed:    'bg-base-elevated text-content-secondary border-base-border',
  purchase: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  reminder: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
}

const TYPE_LABEL: Record<CalendarEventType, string> = {
  income:   'Ingreso',
  expense:  'Gasto',
  payroll:  'Nómina',
  debt:     'Cuota',
  client:   'Cobro',
  fixed:    'Fijo',
  purchase: 'Compra',
  reminder: 'Recordatorio',
}

export { TYPE_COLOR, TYPE_LABEL }

// Pull PurchaseItems and Reminders from localStorage into calendar events
export function getPurchaseCalendarEvents(month: number, year: number): CalendarEvent[] {
  const events: CalendarEvent[] = []
  try {
    const purchases: Array<{ id: string; title: string; dueDate?: string; status: string; estimatedAmount?: number }> =
      JSON.parse(localStorage.getItem('finanzas:purchases') ?? '[]')

    for (const p of purchases) {
      if (!p.dueDate || (p.status === 'PURCHASED' || p.status === 'CANCELLED')) continue
      const d = new Date(p.dueDate + 'T00:00:00')
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue
      events.push({
        id:          `purchase-${p.id}`,
        title:       p.title,
        amount:      p.estimatedAmount ?? 0,
        type:        'purchase',
        day:         d.getDate(),
        month,
        year,
        status:      'pending',
        description: 'Por comprar',
      })
    }

    const reminders: Array<{ id: string; title: string; reminderDate: string; status: string }> =
      JSON.parse(localStorage.getItem('finanzas:reminders') ?? '[]')

    for (const r of reminders) {
      if (r.status !== 'PENDING') continue
      const d = new Date(r.reminderDate + 'T00:00:00')
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue
      events.push({
        id:          `reminder-${r.id}`,
        title:       r.title,
        amount:      0,
        type:        'reminder',
        day:         d.getDate(),
        month,
        year,
        status:      'pending',
        description: 'Recordatorio',
      })
    }
  } catch { /* ignore parse errors */ }
  return events
}

export function generateMonthEvents(month: number, year: number): CalendarEvent[] {
  const now = new Date()
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()
  const today = now.getDate()

  function status(day: number): 'pending' | 'paid' | 'overdue' {
    if (!isCurrentMonth) return day < 15 ? 'paid' : 'pending'
    if (day < today) return 'paid'
    if (day === today) return 'pending'
    return 'pending'
  }

  const events: CalendarEvent[] = [
    // ── Nómina (Fernando ADS) ────────────────────────────────────────────────
    { id: 'pay-leo',      title: 'Leo Aguado',      amount: 400,  type: 'payroll', day: 15, month, year, status: status(15), description: 'Nómina mensual' },
    { id: 'pay-barbara',  title: 'Bárbara Flores',  amount: 130,  type: 'payroll', day: 15, month, year, status: status(15), description: 'Nómina mensual' },
    { id: 'pay-fernanda', title: 'Fernanda Mollica', amount: 500, type: 'payroll', day: 1,  month, year, status: status(1),  description: 'Nómina mensual' },
    { id: 'pay-victor',   title: 'Victor Pereira',  amount: 320,  type: 'payroll', day: 30, month, year, status: status(30), description: 'Nómina mensual' },
    { id: 'pay-mariale',  title: 'Mariale Pereira', amount: 270,  type: 'payroll', day: 30, month, year, status: status(30), description: 'Nómina mensual' },

    // ── Clientes (Cobros) ─────────────────────────────────────────────────────
    { id: 'cli-toyo',       title: 'Toyo Éxito',       amount: 300, type: 'client', day: 10, month, year, status: status(10), description: 'Gestión Meta Ads' },
    { id: 'cli-calzado',    title: 'Calzado Standar',   amount: 350, type: 'client', day: 20, month, year, status: status(20), description: 'Gestión Meta Ads' },
    { id: 'cli-challenger', title: 'Challenger 007',    amount: 250, type: 'client', day: 5,  month, year, status: 'overdue', description: 'Gestión Meta Ads' },
    { id: 'cli-hangten',    title: 'Hang Ten',          amount: 200, type: 'client', day: 25, month, year, status: status(25), description: 'Google Ads' },

    // ── Gastos fijos ──────────────────────────────────────────────────────────
    { id: 'fix-chatgpt',  title: 'ChatGPT',    amount: 20,  type: 'fixed', day: 25, month, year, status: status(25), description: 'Suscripción' },
    { id: 'fix-claude',   title: 'Claude',     amount: 20,  type: 'fixed', day: 25, month, year, status: status(25), description: 'Suscripción' },
    { id: 'fix-internet', title: 'Internet',   amount: 40,  type: 'fixed', day: 5,  month, year, status: status(5),  description: 'Servicio' },

    // ── Cashea (cuotas) ───────────────────────────────────────────────────────
    { id: 'cashea-1', title: 'MacBook Air — Cuota', amount: 167, type: 'debt', day: 20, month, year, status: status(20), description: 'Cashea' },

    // ── SAN ───────────────────────────────────────────────────────────────────
    { id: 'san-1', title: 'SAN — Cuota',             amount: 100, type: 'debt', day: 28, month, year, status: status(28), description: 'SAN' },
  ]

  return events
}

export function getEventsForDay(events: CalendarEvent[], day: number): CalendarEvent[] {
  return events.filter(e => e.day === day).sort((a, b) => a.type.localeCompare(b.type))
}
