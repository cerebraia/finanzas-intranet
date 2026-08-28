import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Bell, Plus, CheckCircle2, X, AlarmClock, Clock } from 'lucide-react'
import { PageHeader, Card, ConfirmDialog } from '@/components/ui'
import { useReminders } from '@/hooks/usePurchases'
import { formatDate, cn } from '@/lib/utils'
import type { Reminder, PurchasePriority } from '@/types/purchases'
import { PRIORITY_CLS, PRIORITY_LABEL } from '@/types/purchases'

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

const SOURCE_LABEL: Record<Reminder['sourceType'], string> = {
  PURCHASE:         'Compra',
  PAYROLL:          'Nómina',
  RECEIVABLE:       'Cobro',
  DEBT:             'Deuda',
  CASHEA:           'Cashea',
  SAN:              'SAN',
  RECURRING_EXPENSE:'Gasto fijo',
  MANUAL:           'Manual',
}

function ReminderStatusBadge({ r }: { r: Reminder }) {
  const today = new Date().toISOString().slice(0, 10)
  const effective = r.snoozedTo ?? r.reminderDate
  const isOverdue = effective < today && r.status === 'PENDING'
  const isToday   = effective === today

  if (r.status === 'COMPLETED') return <span className="text-[10px] text-emerald-400">Completado</span>
  if (r.status === 'DISMISSED') return <span className="text-[10px] text-content-disabled">Ignorado</span>
  if (isOverdue) return <span className="text-[10px] text-red-400 flex items-center gap-1"><Clock className="w-3 h-3" />Vencido</span>
  if (isToday)   return <span className="text-[10px] text-amber-400">Hoy</span>
  return <span className="text-[10px] text-content-muted">{formatDate(effective)}</span>
}

function AddReminderModal({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void
  onCreate: (data: { title: string; reminderDate: string; priority: PurchasePriority; description?: string }) => void
}) {
  const [title,    setTitle]    = useState('')
  const [date,     setDate]     = useState('')
  const [priority, setPriority] = useState<PurchasePriority>('MEDIUM')
  const [desc,     setDesc]     = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !date) return
    onCreate({ title, reminderDate: date, priority, description: desc || undefined })
    setTitle(''); setDate(''); setPriority('MEDIUM'); setDesc('')
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={cn(
          'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-md',
          'bg-base-surface border border-base-border rounded-2xl shadow-glow animate-fade-in focus:outline-none'
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
            <Dialog.Title className="text-sm font-semibold text-content-primary">Nuevo recordatorio</Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div>
              <label className={labelCls}>¿Qué debes recordar? *</label>
              <input required autoFocus value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Llamar al seguro, Renovar dominio..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha del recordatorio *</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prioridad</label>
              <div className="flex gap-2">
                {(['LOW','MEDIUM','HIGH','URGENT'] as PurchasePriority[]).map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={cn('flex-1 py-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-all',
                      priority === p ? PRIORITY_CLS[p] : 'border-base-border text-content-disabled hover:text-content-muted')}>
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Descripción (opcional)</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detalles..." className={inputCls} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">Cancelar</button>
              <button type="submit" className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all">Guardar</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function RemindersPage() {
  const { items, complete, dismiss, snooze, create, remove } = useReminders()
  const [addOpen,       setAddOpen]       = useState(false)
  const [snoozeId,      setSnoozeId]      = useState<string | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<string | null>(null)

  const pending   = items.filter(r => r.status === 'PENDING')
  const completed = items.filter(r => r.status !== 'PENDING')

  function sortedPending(list: Reminder[]) {
    const today = new Date().toISOString().slice(0, 10)
    return [...list].sort((a, b) => {
      const ea = a.snoozedTo ?? a.reminderDate
      const eb = b.snoozedTo ?? b.reminderDate
      const overA = ea < today ? -1 : 1
      const overB = eb < today ? -1 : 1
      if (overA !== overB) return overA - overB
      return ea.localeCompare(eb)
    })
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6 max-w-2xl">
      <PageHeader
        title="Recordatorios"
        description="Vista unificada de todos tus compromisos y alertas"
        actions={
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all">
            <Plus className="w-3.5 h-3.5" /> Recordatorio
          </button>
        }
      />

      {/* Pendientes */}
      {pending.length === 0 ? (
        <Card className="p-10 text-center space-y-2">
          <Bell className="w-8 h-8 text-content-disabled mx-auto" />
          <p className="text-sm font-semibold text-content-primary">Sin recordatorios pendientes</p>
          <p className="text-xs text-content-muted">Crea uno con el botón + Recordatorio.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wider px-1">
            Pendientes ({pending.length})
          </p>
          {sortedPending(pending).map(r => (
            <div key={r.id} className="rounded-xl border border-base-border bg-base-surface p-4 flex items-start gap-3 hover:bg-base-hover transition-colors">
              <button onClick={() => complete(r.id)} className="flex-shrink-0 mt-0.5 text-content-disabled hover:text-emerald-400 transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-content-primary truncate">{r.title}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase', PRIORITY_CLS[r.priority])}>
                      {PRIORITY_LABEL[r.priority]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-elevated border border-base-border text-content-disabled">
                    {SOURCE_LABEL[r.sourceType]}
                  </span>
                  <ReminderStatusBadge r={r} />
                  {r.description && <span className="text-xs text-content-muted">{r.description}</span>}
                </div>
                {/* Snooze options */}
                {snoozeId === r.id ? (
                  <div className="flex gap-2 pt-1">
                    <p className="text-xs text-content-muted self-center">Posponer:</p>
                    {[1, 3, 7].map(d => (
                      <button key={d} onClick={() => { snooze(r.id, d); setSnoozeId(null) }}
                        className="text-xs px-2 py-0.5 rounded border border-base-border text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                        {d === 1 ? 'Mañana' : d === 3 ? '3 días' : '1 semana'}
                      </button>
                    ))}
                    <button onClick={() => setSnoozeId(null)} className="text-xs text-content-disabled hover:text-content-muted">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-0.5">
                    <button onClick={() => setSnoozeId(r.id)} className="text-xs text-content-disabled hover:text-content-muted flex items-center gap-1 transition-colors">
                      <AlarmClock className="w-3 h-3" /> Posponer
                    </button>
                    <button onClick={() => dismiss(r.id)} className="text-xs text-content-disabled hover:text-content-muted transition-colors">
                      Ignorar
                    </button>
                    <button onClick={() => setDeleteTarget(r.id)} className="text-xs text-content-disabled hover:text-red-400 transition-colors">
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completados */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wider px-1">
            Historial ({completed.length})
          </p>
          {completed.slice(0, 10).map(r => (
            <div key={r.id} className="rounded-xl border border-base-border bg-base-surface/50 p-3 flex items-center gap-3 opacity-60">
              <CheckCircle2 className={cn('w-4 h-4 flex-shrink-0', r.status === 'COMPLETED' ? 'text-emerald-400' : 'text-content-disabled')} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-content-secondary line-through truncate">{r.title}</p>
              </div>
              <ReminderStatusBadge r={r} />
              <button onClick={() => setDeleteTarget(r.id)} className="text-content-disabled hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddReminderModal open={addOpen} onClose={() => setAddOpen(false)} onCreate={create} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar recordatorio"
        description="¿Deseas eliminar este recordatorio? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => { if (deleteTarget) { remove(deleteTarget); setDeleteTarget(null) } }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
