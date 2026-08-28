import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useCreateDebt } from '@/hooks/useDebts'
import { cn } from '@/lib/utils'
import type { DebtType } from '@/types/api'

interface NewDebtModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: 'CASHEA',       label: 'Cashea' },
  { value: 'SAN',          label: 'SAN' },
  { value: 'LOAN',         label: 'Préstamo' },
  { value: 'CREDIT_CARD',  label: 'Tarjeta de crédito' },
  { value: 'INSTALLMENT',  label: 'Cuotas / Financiamiento' },
  { value: 'PERSONAL',     label: 'Deuda personal' },
  { value: 'OTHER',        label: 'Otro' },
]

export function NewDebtModal({ open, onClose, workspaceId }: NewDebtModalProps) {
  const [name, setName]               = useState('')
  const [provider, setProvider]       = useState('')
  const [type, setType]               = useState<DebtType>('CASHEA')
  const [originalAmount, setOriginal] = useState('')
  const [downPayment, setDown]        = useState('0')
  const [installments, setInstall]    = useState('')
  const [startDate, setStart]         = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]             = useState('')

  const createDebt = useCreateDebt()

  // Computed
  const financedAmount  = Math.max(0, Number(originalAmount) - Number(downPayment))
  const monthlyAmount   = installments && Number(installments) > 0
    ? financedAmount / Number(installments)
    : 0

  function reset() {
    setName(''); setProvider(''); setType('CASHEA'); setOriginal(''); setDown('0')
    setInstall(''); setStart(new Date().toISOString().slice(0, 10)); setNotes('')
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createDebt.mutateAsync({
      workspaceId,
      name,
      provider:       provider || undefined,
      type,
      originalAmount: Number(originalAmount),
      downPayment:    Number(downPayment),
      financedAmount,
      installments:   Number(installments),
      monthlyAmount,
      startDate,
      notes:          notes || undefined,
    })
    handleClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={cn(
          'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto',
          'bg-base-surface border border-base-border rounded-2xl shadow-glow animate-fade-in focus:outline-none'
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border sticky top-0 bg-base-surface z-10">
            <Dialog.Title className="text-sm font-semibold text-content-primary">Nueva deuda / compromiso</Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* Tipo */}
            <div>
              <label className={labelCls}>Tipo de compromiso *</label>
              <select required value={type} onChange={e => setType(e.target.value as DebtType)} className={inputCls}>
                {DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Nombre y proveedor */}
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: MacBook Air M3, iPhone 16..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Proveedor / Entidad</label>
              <input value={provider} onChange={e => setProvider(e.target.value)} placeholder="Ej: Cashea, Banco Mercantil..." className={inputCls} />
            </div>

            {/* Montos */}
            <div>
              <label className={labelCls}>Monto original (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                <input required type="number" min="0.01" step="0.01" value={originalAmount} onChange={e => setOriginal(e.target.value)}
                  placeholder="0.00" className={cn(inputCls, 'pl-6')} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Inicial / Enganche</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                <input type="number" min="0" step="0.01" value={downPayment} onChange={e => setDown(e.target.value)}
                  placeholder="0.00" className={cn(inputCls, 'pl-6')} />
              </div>
            </div>

            {/* Cuotas */}
            <div>
              <label className={labelCls}>Número de cuotas *</label>
              <input required type="number" min="1" value={installments} onChange={e => setInstall(e.target.value)}
                placeholder="Ej: 6, 12, 24..." className={inputCls} />
            </div>

            {/* Preview calculado */}
            {Number(originalAmount) > 0 && Number(installments) > 0 && (
              <div className="rounded-lg bg-base-elevated border border-base-border p-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">Resumen calculado</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-content-muted">Financiado</p>
                    <p className="font-semibold text-content-primary">${financedAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-content-muted">Cuota mensual</p>
                    <p className="font-semibold text-brand-400">${monthlyAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fecha inicio */}
            <div>
              <label className={labelCls}>Fecha de inicio (primera cuota) *</label>
              <input required type="date" value={startDate} onChange={e => setStart(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observaciones..." className={cn(inputCls, 'resize-none')} />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={createDebt.isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                {createDebt.isPending ? 'Creando...' : 'Crear deuda'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
