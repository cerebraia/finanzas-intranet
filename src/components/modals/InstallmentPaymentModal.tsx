import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useWorkspace }        from '@/context/WorkspaceContext'
import { useAccounts }         from '@/hooks/useAccounts'
import { useRegisterDebtPayment } from '@/hooks/useDebts'
import { formatCurrency, cn }  from '@/lib/utils'
import type { ApiDebtInstallment } from '@/types/api'

interface InstallmentPaymentModalProps {
  open:         boolean
  onClose:      () => void
  installment:  ApiDebtInstallment | null
  debtId:       string
  debtName:     string
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

export function InstallmentPaymentModal({
  open, onClose, installment, debtId, debtName,
}: InstallmentPaymentModalProps) {
  const { activeWorkspace }    = useWorkspace()
  const wsId                   = activeWorkspace.id

  const [amount, setAmount]           = useState('')
  const [accountId, setAccountId]     = useState('')
  const [date, setDate]               = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference]     = useState('')
  const [notes, setNotes]             = useState('')
  const [idempotencyKey, setIdemKey]  = useState(() => crypto.randomUUID())

  const { data: accounts = [] } = useAccounts(wsId)
  const registerPayment         = useRegisterDebtPayment()

  const pending = installment
    ? Number(installment.amount) - Number(installment.amountPaid)
    : 0

  useEffect(() => {
    if (open && installment) {
      setAmount(String(pending.toFixed(2)))
      setAccountId('')
      setDate(new Date().toISOString().slice(0, 10))
      setReference('')
      setNotes('')
      setIdemKey(crypto.randomUUID())
    }
  }, [open, installment])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!installment) return
    await registerPayment.mutateAsync({
      installmentId: installment.id,
      data: {
        workspaceId:     wsId,
        debtId,
        installmentId:   installment.id,
        accountId,
        amount:          Number(amount),
        paymentDate:     date,
        reference:       reference || undefined,
        notes:           notes || undefined,
        idempotencyKey,
      },
    })
    onClose()
  }

  if (!installment) return null

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
              <Dialog.Title className="text-sm font-semibold text-content-primary">Pagar cuota</Dialog.Title>
              <p className="text-xs text-content-muted mt-0.5">{debtName}</p>
            </div>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div className="rounded-lg bg-base-elevated border border-base-border p-3 space-y-1">
              <p className="text-xs text-content-muted">Cuota {installment.number}</p>
              <div className="flex justify-between">
                <span className="text-xs text-content-muted">Total: {formatCurrency(Number(installment.amount))}</span>
                <span className="text-xs font-semibold text-amber-400">Pendiente: {formatCurrency(pending)}</span>
              </div>
            </div>

            <div>
              <label className={labelCls}>Monto a pagar *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                <input required type="number" min="0.01" step="0.01" max={pending}
                  value={amount} onChange={e => setAmount(e.target.value)}
                  className={cn(inputCls, 'pl-6')} />
              </div>
              <p className="text-[10px] text-content-disabled mt-1">Máximo: {formatCurrency(pending)}</p>
            </div>

            <div>
              <label className={labelCls}>Cuenta *</label>
              <select required value={accountId} onChange={e => setAccountId(e.target.value)} className={inputCls}>
                <option value="">Seleccionar cuenta</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Fecha de pago *</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Referencia (opcional)</label>
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Número de transacción" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Notas (opcional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones" className={inputCls} />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={registerPayment.isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                {registerPayment.isPending ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
