import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnnualGoals } from '@/hooks/useAnnualGoals'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { AnnualGoal, AnnualGoalStatus } from '@/types/annualGoals'

const QUICK_VALUES = [0, 10, 25, 50, 75, 100] as const

const STATUS_OPTIONS: { value: AnnualGoalStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Pendiente'    },
  { value: 'IN_PROGRESS', label: 'En progreso'  },
  { value: 'PAUSED',      label: 'Pausada'      },
]

interface Props {
  goal:        AnnualGoal
  onClose:     () => void
  workspaceId: string
  year:        number
}

export function UpdateProgressModal({ goal, onClose, workspaceId: _wsId, year }: Props) {
  const { updateProgress, complete } = useAnnualGoals(year)
  const [progress,  setProgress]  = useState(goal.progress)
  const [custom,    setCustom]    = useState(String(goal.progress))
  const [status,    setStatus]    = useState<AnnualGoalStatus>(
    goal.status === 'COMPLETED' || goal.status === 'CANCELLED' ? 'IN_PROGRESS' : goal.status
  )
  const [loading,  setLoading]   = useState(false)
  const [askComplete, setAskComplete] = useState(false)

  function pickQuick(v: number) {
    setProgress(v)
    setCustom(String(v))
  }

  function handleCustomChange(val: string) {
    setCustom(val)
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 0 && n <= 100) setProgress(n)
  }

  async function handleSave() {
    if (progress === 100) {
      setAskComplete(true)
      return
    }
    setLoading(true)
    try {
      await updateProgress(goal.id, progress, status)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmComplete() {
    setLoading(true)
    try {
      await complete(goal.id)
      setAskComplete(false)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveOnly() {
    setLoading(true)
    try {
      await updateProgress(goal.id, progress, status)
      setAskComplete(false)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog.Root open onOpenChange={v => { if (!v) onClose() }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
          <Dialog.Content className="fixed z-50 inset-0 flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-base-border bg-base-surface p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <Dialog.Title className="text-base font-bold text-content-primary">Actualizar progreso</Dialog.Title>
                  <p className="text-xs text-content-muted mt-0.5 line-clamp-1">{goal.title}</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Progress bar preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-content-muted">Progreso actual</span>
                    <span className="text-2xl font-bold text-brand-400">{progress}%</span>
                  </div>
                  <div className="h-3 bg-base-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Quick values */}
                <div>
                  <p className="text-xs font-medium text-content-secondary mb-2">Selección rápida</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {QUICK_VALUES.map(v => (
                      <button
                        key={v}
                        onClick={() => pickQuick(v)}
                        className={cn(
                          'py-2 rounded-xl text-xs font-semibold border transition-colors',
                          progress === v
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'border-base-border text-content-muted hover:text-content-primary hover:border-brand-600/40',
                        )}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom value */}
                <div>
                  <p className="text-xs font-medium text-content-secondary mb-1.5">Valor personalizado</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={custom}
                      onChange={e => handleCustomChange(e.target.value)}
                      className="w-full bg-base-elevated border border-base-border rounded-xl px-3 py-2.5 text-sm text-content-primary focus:outline-none focus:border-brand-600 transition-colors"
                    />
                    <span className="text-sm text-content-muted">%</span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-medium text-content-secondary mb-1.5">Estado</p>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as AnnualGoalStatus)}
                    className="w-full bg-base-elevated border border-base-border rounded-xl px-3 py-2.5 text-sm text-content-primary focus:outline-none focus:border-brand-600 transition-colors"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Ask complete when 100% */}
      <ConfirmDialog
        open={askComplete}
        title="¿Marcar como completada?"
        description={`El progreso es 100%. ¿Quieres marcar "${goal.title}" como completada?`}
        confirmLabel="Completar"
        cancelLabel="Solo guardar 100%"
        variant="warning"
        onConfirm={handleConfirmComplete}
        onCancel={handleSaveOnly}
      />
    </>
  )
}
