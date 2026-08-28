import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnnualGoals } from '@/hooks/useAnnualGoals'
import { CATEGORY_LABEL, PRIORITY_LABEL } from '@/types/annualGoals'
import type { AnnualGoalCategory, AnnualGoalPriority, AnnualGoalProgressMode } from '@/types/annualGoals'

const CATEGORIES: AnnualGoalCategory[] = [
  'PERSONAL','FAMILY','FINANCIAL','BUSINESS',
  'HEALTH','EDUCATION','PURCHASE','TRAVEL','PROJECT','OTHER',
]

const PRIORITIES: AnnualGoalPriority[] = ['LOW','MEDIUM','HIGH','CRITICAL']

interface Props {
  open:        boolean
  onClose:     () => void
  workspaceId: string
  year:        number
}

export function NewAnnualGoalModal({ open, onClose, workspaceId, year }: Props) {
  const { create } = useAnnualGoals(year)
  const [loading, setLoading] = useState(false)

  const [title,        setTitle]        = useState('')
  const [description,  setDescription]  = useState('')
  const [category,     setCategory]     = useState<AnnualGoalCategory>('PERSONAL')
  const [priority,     setPriority]     = useState<AnnualGoalPriority>('MEDIUM')
  const [progressMode, setProgressMode] = useState<AnnualGoalProgressMode>('MANUAL')
  const [isFocus,      setIsFocus]      = useState(false)
  const [targetDate,   setTargetDate]   = useState('')
  const [notes,        setNotes]        = useState('')

  function reset() {
    setTitle(''); setDescription(''); setCategory('PERSONAL'); setPriority('MEDIUM')
    setProgressMode('MANUAL'); setIsFocus(false); setTargetDate(''); setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await create({
        workspaceId,
        title:       title.trim(),
        description: description.trim() || undefined,
        year,
        category,
        priority,
        progressMode,
        isFocus,
        targetDate:  targetDate || undefined,
        notes:       notes.trim() || undefined,
      })
      reset()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed z-50 inset-0 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-base-border bg-base-surface p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-bold text-content-primary">Nueva meta</Dialog.Title>
              <button onClick={onClose} className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  ¿Qué quieres lograr? <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Mejorar mi inglés"
                  maxLength={120}
                  required
                  className="w-full bg-base-elevated border border-base-border rounded-xl px-3 py-2.5 text-sm text-content-primary placeholder:text-content-disabled focus:outline-none focus:border-brand-600 transition-colors"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">Descripción</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detalles adicionales..."
                  rows={2}
                  className="w-full bg-base-elevated border border-base-border rounded-xl px-3 py-2.5 text-sm text-content-primary placeholder:text-content-disabled focus:outline-none focus:border-brand-600 transition-colors resize-none"
                />
              </div>

              {/* Categoría + Prioridad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">Categoría</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as AnnualGoalCategory)}
                    className="w-full bg-base-elevated border border-base-border rounded-xl px-3 py-2.5 text-sm text-content-primary focus:outline-none focus:border-brand-600 transition-colors"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">Prioridad</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as AnnualGoalPriority)}
                    className="w-full bg-base-elevated border border-base-border rounded-xl px-3 py-2.5 text-sm text-content-primary focus:outline-none focus:border-brand-600 transition-colors"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fecha objetivo */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">Fecha objetivo (opcional)</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full bg-base-elevated border border-base-border rounded-xl px-3 py-2.5 text-sm text-content-primary focus:outline-none focus:border-brand-600 transition-colors"
                />
              </div>

              {/* Modo de progreso */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-2">Modo de progreso</label>
                <div className="flex gap-2">
                  {(['MANUAL','MILESTONES'] as AnnualGoalProgressMode[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setProgressMode(m)}
                      className={cn(
                        'flex-1 py-2 rounded-xl border text-xs font-medium transition-colors',
                        progressMode === m
                          ? 'bg-brand-600/20 border-brand-600/40 text-brand-400'
                          : 'border-base-border text-content-muted hover:text-content-primary',
                      )}
                    >
                      {m === 'MANUAL' ? 'Manual' : 'Por hitos'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enfoque */}
              <div className="flex items-center gap-2">
                <input
                  id="isFocus"
                  type="checkbox"
                  checked={isFocus}
                  onChange={e => setIsFocus(e.target.checked)}
                  className="w-4 h-4 accent-brand-600 rounded"
                />
                <label htmlFor="isFocus" className="text-xs text-content-secondary">
                  Añadir a mi enfoque actual
                </label>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">Notas</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full bg-base-elevated border border-base-border rounded-xl px-3 py-2.5 text-sm text-content-primary placeholder:text-content-disabled focus:outline-none focus:border-brand-600 transition-colors resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creando...' : 'Crear meta'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
