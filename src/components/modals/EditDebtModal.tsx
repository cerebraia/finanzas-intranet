import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useWorkspace }   from '@/context/WorkspaceContext'
import { useUpdateDebt }  from '@/hooks/useDebts'
import { cn }             from '@/lib/utils'
import type { ApiDebt, DebtStatus } from '@/types/api'

interface Props {
  open:    boolean
  onClose: () => void
  debt:    ApiDebt | null
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

const STATUS_OPTIONS: { value: DebtStatus; label: string }[] = [
  { value: 'ACTIVE',    label: 'Activa' },
  { value: 'PAUSED',    label: 'Pausada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'DEFAULTED', label: 'En mora' },
]

export function EditDebtModal({ open, onClose, debt }: Props) {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const [name,     setName]     = useState('')
  const [provider, setProvider] = useState('')
  const [notes,    setNotes]    = useState('')
  const [status,   setStatus]   = useState<DebtStatus>('ACTIVE')

  const updateDebt = useUpdateDebt()

  useEffect(() => {
    if (debt && open) {
      setName(debt.name)
      setProvider(debt.provider ?? '')
      setNotes(debt.notes ?? '')
      setStatus(debt.status)
    }
  }, [debt, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!debt) return
    await updateDebt.mutateAsync({
      id:          debt.id,
      workspaceId: wsId,
      data:        { name, provider: provider || undefined, notes: notes || undefined, status },
    })
    onClose()
  }

  if (!debt) return null

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
            <div>
              <Dialog.Title className="text-sm font-semibold text-content-primary">Editar deuda</Dialog.Title>
              <p className="text-xs text-content-muted mt-0.5">{debt.name}</p>
            </div>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre de la deuda"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Proveedor / Acreedor</label>
              <input
                value={provider}
                onChange={e => setProvider(e.target.value)}
                placeholder="Ej: Banco, Persona, Tienda..."
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value as DebtStatus)} className={inputCls}>
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Notas</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Notas opcionales..."
                className={cn(inputCls, 'resize-none')}
              />
            </div>

            <p className="text-[11px] text-content-disabled">
              El monto original, número de cuotas y fechas no pueden modificarse directamente si ya existen pagos registrados.
            </p>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={updateDebt.isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                {updateDebt.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
