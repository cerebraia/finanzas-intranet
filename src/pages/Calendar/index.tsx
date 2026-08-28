import { useState } from 'react'
import { useQuery }  from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui'
import { formatCurrency, cn } from '@/lib/utils'
import { calendarService } from '@/services/calendar.service'
import { useWorkspace }    from '@/context/WorkspaceContext'
import {
  TYPE_COLOR, TYPE_LABEL,
  type CalendarEvent,
} from '@/mocks/calendar.mock'

function getEventsForDay(events: CalendarEvent[], day: number): CalendarEvent[] {
  return events.filter(e => e.day === day)
}

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const STATUS_CLS = {
  paid:    'opacity-50',
  pending: '',
  overdue: 'ring-1 ring-red-500/50',
}

function EventBadge({ event }: { event: CalendarEvent }) {
  return (
    <div className={cn(
      'text-[9px] px-1 py-0.5 rounded border truncate leading-tight font-medium',
      TYPE_COLOR[event.type],
      event.status === 'paid' ? 'opacity-50' : '',
    )}>
      {event.title.split(' ')[0]}
    </div>
  )
}

function DayPanel({ day, month, year, events, onClose }: {
  day: number; month: number; year: number
  events: CalendarEvent[]; onClose: () => void
}) {
  const income  = events.filter(e => e.type === 'client' || e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = events.filter(e => e.type !== 'client' && e.type !== 'income').reduce((s, e) => s + e.amount, 0)

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-base-surface border-l border-base-border shadow-glow animate-slide-in overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-base-border sticky top-0 bg-base-surface z-10">
        <div>
          <p className="text-sm font-semibold text-content-primary">
            {day} de {MONTH_NAMES[month - 1]} {year}
          </p>
          <p className="text-xs text-content-muted">{events.length} eventos</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-content-muted hover:bg-base-hover transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Resumen del día */}
      {events.length > 0 && (
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-base-border">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Ingresos</p>
            <p className="text-base font-bold text-emerald-400 tabular-nums">+{formatCurrency(income)}</p>
          </div>
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1">Gastos</p>
            <p className="text-base font-bold text-red-400 tabular-nums">-{formatCurrency(expense)}</p>
          </div>
        </div>
      )}

      {/* Eventos del día */}
      <div className="p-4 space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-content-muted text-center py-6">Sin eventos este día</p>
        ) : (
          events.map(event => (
            <div key={event.id} className={cn(
              'rounded-xl border p-3 space-y-1',
              TYPE_COLOR[event.type],
              STATUS_CLS[event.status],
            )}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-content-primary">{event.title}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide">
                  {TYPE_LABEL[event.type]}
                </span>
              </div>
              <p className="text-xs text-content-muted">{event.description}</p>
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-sm font-bold tabular-nums',
                  event.type === 'client' || event.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {event.type === 'client' || event.type === 'income' ? '+' : '-'}
                  {formatCurrency(event.amount)}
                </span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded border',
                  event.status === 'paid'    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  event.status === 'overdue' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                )}>
                  {event.status === 'paid' ? 'Pagado' : event.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function CalendarPage() {
  const now = new Date()
  const { activeWorkspace } = useWorkspace()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const { data: events = [] } = useQuery({
    queryKey: ['calendar', activeWorkspace.id, month, year],
    queryFn:  () => calendarService.getEvents(activeWorkspace.id, month, year),
    enabled:  !!activeWorkspace.id,
  })

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
  const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDay + 1
    return d >= 1 && d <= daysInMonth ? d : null
  })

  // Stats
  const totalIncome  = events.filter(e => e.type === 'client' || e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpense = events.filter(e => e.type !== 'client' && e.type !== 'income').reduce((s, e) => s + e.amount, 0)

  const dayEvents = selectedDay ? getEventsForDay(events, selectedDay) : []

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <PageHeader
        title="Calendario Financiero"
        description="Vista mensual de todos tus compromisos"
      />

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TYPE_COLOR) as [string, string][]).map(([type, cls]) => (
          <span key={type} className={cn('text-[10px] px-2 py-0.5 rounded border font-medium', cls)}>
            {TYPE_LABEL[type as keyof typeof TYPE_LABEL]}
          </span>
        ))}
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Ingresos</p>
          <p className="text-sm font-bold text-emerald-400 tabular-nums">+{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1">Gastos</p>
          <p className="text-sm font-bold text-red-400 tabular-nums">-{formatCurrency(totalExpense)}</p>
        </div>
        <div className={cn('rounded-xl border p-3 text-center', totalIncome - totalExpense >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5')}>
          <p className="text-[10px] text-content-muted font-semibold uppercase tracking-wider mb-1">Balance</p>
          <p className={cn('text-sm font-bold tabular-nums', totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Header del calendario */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-border">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-content-muted hover:bg-base-hover transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-content-primary">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-content-muted hover:bg-base-hover transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 border-b border-base-border">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-content-disabled">
              {d}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayEvts = day ? getEventsForDay(events, day) : []
            const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()
            const isSelected = day === selectedDay
            const hasOverdue = dayEvts.some(e => e.status === 'overdue')
            const hasIncome  = dayEvts.some(e => e.type === 'client' || e.type === 'income')
            const hasExpense = dayEvts.some(e => e.type !== 'client' && e.type !== 'income')

            return (
              <div
                key={i}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                className={cn(
                  'min-h-[70px] md:min-h-[90px] p-1 border-r border-b border-base-border/50 last:border-r-0 transition-colors',
                  day ? 'cursor-pointer hover:bg-base-hover' : '',
                  isSelected ? 'bg-brand-600/10' : '',
                  !day ? 'bg-base/30' : '',
                )}
              >
                {day && (
                  <>
                    {/* Número del día */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'bg-brand-600 text-white' : isSelected ? 'text-brand-400' : 'text-content-secondary',
                        hasOverdue ? 'ring-1 ring-red-500' : '',
                      )}>
                        {day}
                      </span>
                      {/* Indicadores */}
                      <div className="flex gap-0.5">
                        {hasIncome  && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        {hasExpense && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                      </div>
                    </div>

                    {/* Events preview (max 2) */}
                    <div className="space-y-0.5">
                      {dayEvts.slice(0, 2).map(e => (
                        <EventBadge key={e.id} event={e} />
                      ))}
                      {dayEvts.length > 2 && (
                        <p className="text-[9px] text-content-disabled pl-0.5">+{dayEvts.length - 2} más</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Panel lateral del día */}
      {selectedDay && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSelectedDay(null)} />
          <DayPanel
            day={selectedDay}
            month={month}
            year={year}
            events={dayEvents}
            onClose={() => setSelectedDay(null)}
          />
        </>
      )}
    </div>
  )
}
