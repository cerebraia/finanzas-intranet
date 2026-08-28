import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMilestones } from '@/hooks/useAnnualGoals'
import type { AnnualGoal } from '@/types/annualGoals'

interface Props {
  goal:        AnnualGoal
  onClose:     () => void
  workspaceId: string
  year:        number
}

export function ManageMilestonesModal({ goal, onClose, workspaceId, year }: Props) {
  const { milestones, isLoading, create, toggle, remove } = useMilestones(goal.id, workspaceId, year)
  const [newTitle,   setNewTitle]   = useState('')
  const [adding,     setAdding]     = useState(false)
  const [savingNew,  setSavingNew]  = useState(false)

  const done  = milestones.filter(m => m.status === 'COMPLETED').length
  const total = milestones.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleAdd() {
    if (!newTitle.trim()) return
    setSavingNew(true)
    try {
      await create({
        workspaceId,
        goalId:    goal.id,
        title:     newTitle.trim(),
        sortOrder: milestones.length,
      })
      setNewTitle('')
      setAdding(false)
    } finally {
      setSavingNew(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={v => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed z-50 inset-0 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-base-border bg-base-surface p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <Dialog.Title className="text-base font-bold text-content-primary">Hitos</Dialog.Title>
                <p className="text-xs text-content-muted mt-0.5 line-clamp-1">{goal.title}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress summary */}
            {total > 0 && (
              <div className="mb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-content-muted">{done} / {total} completados</span>
                  <span className="text-xs font-bold text-brand-400">{pct}%</span>
                </div>
                <div className="h-1.5 bg-base-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Milestone list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {isLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                </div>
              ) : milestones.length === 0 ? (
                <div className="py-8 text-center text-xs text-content-muted">
                  Sin hitos. Agrega el primero.
                </div>
              ) : (
                milestones.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-base-border bg-base-elevated group hover:border-brand-600/20 transition-colors"
                  >
                    <button
                      onClick={() => toggle(m.id)}
                      className={cn(
                        'flex-shrink-0 transition-colors',
                        m.status === 'COMPLETED'
                          ? 'text-emerald-400'
                          : 'text-content-disabled hover:text-brand-400',
                      )}
                    >
                      {m.status === 'COMPLETED'
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <Circle className="w-4 h-4" />
                      }
                    </button>
                    <span className={cn(
                      'flex-1 text-sm',
                      m.status === 'COMPLETED'
                        ? 'line-through text-content-muted'
                        : 'text-content-primary',
                    )}>
                      {m.title}
                    </span>
                    <button
                      onClick={() => remove(m.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-content-disabled hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}

              {/* Add form inline */}
              {adding && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-600/40 bg-base-elevated">
                  <input
                    type="text"
                    autoFocus
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdd()
                      if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
                    }}
                    placeholder="Título del hito..."
                    className="flex-1 bg-transparent text-sm text-content-primary placeholder:text-content-disabled focus:outline-none"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={savingNew || !newTitle.trim()}
                    className="text-xs px-2 py-1 rounded-lg bg-brand-600 text-white font-medium disabled:opacity-50 transition-colors hover:bg-brand-700"
                  >
                    {savingNew ? '...' : 'Agregar'}
                  </button>
                  <button
                    onClick={() => { setAdding(false); setNewTitle('') }}
                    className="text-xs px-2 py-1 rounded-lg border border-base-border text-content-muted hover:text-content-primary transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-4 flex-shrink-0 border-t border-base-border mt-4">
              {!adding && (
                <button
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-brand-600/40 text-xs font-medium text-brand-400 hover:bg-brand-600/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar hito
                </button>
              )}
              <button
                onClick={onClose}
                className="ml-auto px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
