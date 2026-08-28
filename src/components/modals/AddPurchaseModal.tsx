import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PURCHASE_CATEGORIES, PRIORITY_LABEL } from '@/types/purchases'
import type { PurchasePriority, PurchaseCategory } from '@/types/purchases'

interface AddPurchaseModalProps {
  open:        boolean
  onClose:     () => void
  onSave:      (data: {
    title:            string
    category:         PurchaseCategory
    priority:         PurchasePriority
    estimatedAmount?: number
    dueDate?:         string
    reminderDate?:    string
    description?:     string
    notes?:           string
  }) => void
  defaultTitle?: string
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

const PRIORITY_BADGE: Record<PurchasePriority, string> = {
  LOW:    'bg-base-elevated border-base-border text-content-disabled',
  MEDIUM: 'bg-brand-600/10 border-brand-600/20 text-brand-400',
  HIGH:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
  URGENT: 'bg-red-500/10 border-red-500/20 text-red-400',
}

export function AddPurchaseModal({ open, onClose, onSave, defaultTitle = '' }: AddPurchaseModalProps) {
  const [title,    setTitle]   = useState(defaultTitle)
  const [category, setCategory] = useState<PurchaseCategory>('Personal')
  const [priority, setPriority] = useState<PurchasePriority>('MEDIUM')
  const [amount,   setAmount]  = useState('')
  const [dueDate,  setDueDate] = useState('')
  const [reminder, setReminder] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [desc,     setDesc]    = useState('')
  const [notes,    setNotes]   = useState('')

  function reset() {
    setTitle(defaultTitle); setCategory('Personal'); setPriority('MEDIUM')
    setAmount(''); setDueDate(''); setReminder(''); setShowMore(false)
    setDesc(''); setNotes('')
  }

  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title:            title.trim(),
      category,
      priority,
      estimatedAmount:  amount ? Number(amount) : undefined,
      dueDate:          dueDate || undefined,
      reminderDate:     reminder || undefined,
      description:      desc || undefined,
      notes:            notes || undefined,
    })
    handleClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={cn(
          'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto',
          'bg-base-surface border border-base-border rounded-2xl shadow-glow animate-fade-in focus:outline-none'
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border sticky top-0 bg-base-surface z-10">
            <Dialog.Title className="text-sm font-semibold text-content-primary">¿Qué necesitas comprar?</Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* Título */}
            <div>
              <input
                required autoFocus
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Aceite para la camioneta..."
                className={cn(inputCls, 'text-base font-medium')}
              />
            </div>

            {/* Prioridad rápida */}
            <div>
              <label className={labelCls}>Prioridad</label>
              <div className="flex gap-2">
                {(['LOW','MEDIUM','HIGH','URGENT'] as PurchasePriority[]).map(p => (
                  <button
                    key={p} type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-all',
                      priority === p ? PRIORITY_BADGE[p] : 'border-base-border text-content-disabled hover:text-content-muted'
                    )}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoría + Monto */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Categoría</label>
                <select value={category} onChange={e => setCategory(e.target.value as PurchaseCategory)} className={inputCls}>
                  {PURCHASE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Monto estimado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="Opcional" className={cn(inputCls, 'pl-6')} />
                </div>
              </div>
            </div>

            {/* Fecha límite + Recordatorio */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Comprar antes de</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Recordarme el</label>
                <input type="date" value={reminder} onChange={e => setReminder(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Más opciones */}
            <button type="button" onClick={() => setShowMore(v => !v)}
              className="flex items-center gap-1 text-xs text-content-muted hover:text-content-primary transition-colors">
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showMore && 'rotate-180')} />
              {showMore ? 'Menos opciones' : 'Más opciones'}
            </button>
            {showMore && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className={labelCls}>Descripción</label>
                  <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detalles adicionales" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Notas</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observaciones..." className={cn(inputCls, 'resize-none')} />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all">
                Guardar
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
