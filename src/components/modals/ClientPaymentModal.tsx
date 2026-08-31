import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useWorkspace }        from '@/context/WorkspaceContext'
import { useAccounts }         from '@/hooks/useAccounts'
import { useClientReceivables } from '@/hooks/useClients'
import { useRegisterPayment }  from '@/hooks/useReceivables'
import { formatCurrency, cn }  from '@/lib/utils'

interface Props {
  open:         boolean
  onClose:      () => void
  clientId:     string
  clientName:   string
  receivableId?: string
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

export function ClientPaymentModal({ open, onClose, clientId, clientName, receivableId: initialReceivableId }: Props) {
  const { activeWorkspace }    = useWorkspace()
  const wsId                   = activeWorkspace.id

  const [selectedReceivableId, setSelectedReceivableId] = useState(initialReceivableId ?? '')
  const [amount,      setAmount]      = useState('')
  const [accountId,   setAccountId]   = useState('')
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [reference,   setReference]   = useState('')
  const [notes,       setNotes]       = useState('')
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const { data: accounts = [] }     = useAccounts(wsId)
  const { data: receivables = [] }  = useClientReceivables(clientId, wsId)
  const registerPayment             = useRegisterPayment()

  const pendingReceivables = receivables.filter(r => r.status !== 'PAID' && r.status !== 'CANCELLED')

  const selectedReceivable = pendingReceivables.find(r => r.id === selectedReceivableId) ?? null
  const maxAmount = selectedReceivable
    ? Number(selectedReceivable.amount) - Number(selectedReceivable.amountPaid)
    : undefined

  useEffect(() => {
    if (open) {
      setSelectedReceivableId(initialReceivableId ?? '')
      setAmount('')
      setAccountId('')
      setDate(new Date().toISOString().slice(0, 10))
      setReference('')
      setNotes('')
    }
  }, [open, initialReceivableId])

  useEffect(() => {
    if (selectedReceivable) {
      const pending = Number(selectedReceivable.amount) - Number(selectedReceivable.amountPaid)
      setAmount(pending.toFixed(2))
    }
  }, [selectedReceivableId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedReceivableId) return

    await registerPayment.mutateAsync({
      receivableId: selectedReceivableId,
      data: {
        workspaceId:    wsId,
        clientId,
        accountId,
        amount:         Number(amount),
        paymentDate:    date,
        reference:      reference || undefined,
        notes:          notes     || undefined,
        idempotencyKey,
      },
    })
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
            <div>
              <Dialog.Title className="text-sm font-semibold text-content-primary">Registrar cobro</Dialog.Title>
              <p className="text-xs text-content-muted mt-0.5">{clientName}</p>
            </div>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {pendingReceivables.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-content-muted">Este cliente no tiene cobros pendientes.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className={labelCls}>Cuenta por cobrar *</label>
                  <select
                    required
                    value={selectedReceivableId}
                    onChange={e => setSelectedReceivableId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Seleccionar...</option>
                    {pendingReceivables.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.description} — {formatCurrency(Number(r.amount) - Number(r.amountPaid))} pendiente
                      </option>
                    ))}
                  </select>
                </div>

                {selectedReceivable && (
                  <div className="rounded-lg bg-base-elevated border border-base-border p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-content-muted">Total:</span>
                      <span>{formatCurrency(Number(selectedReceivable.amount))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-muted">Ya cobrado:</span>
                      <span className="text-emerald-400">{formatCurrency(Number(selectedReceivable.amountPaid))}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-content-muted">Pendiente:</span>
                      <span className="text-amber-400">{formatCurrency(maxAmount ?? 0)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Monto recibido *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={maxAmount}
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className={cn(inputCls, 'pl-6')}
                    />
                  </div>
                  {maxAmount !== undefined && (
                    <p className="text-[10px] text-content-disabled mt-1">Máximo: {formatCurrency(maxAmount)}</p>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Cuenta destino *</label>
                  <select required value={accountId} onChange={e => setAccountId(e.target.value)} className={inputCls}>
                    <option value="">Seleccionar cuenta</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Fecha *</label>
                  <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Referencia (opcional)</label>
                  <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Número de transferencia..." className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Notas (opcional)</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..." className={inputCls} />
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={registerPayment.isPending || !selectedReceivableId}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
                  >
                    {registerPayment.isPending ? 'Registrando...' : 'Confirmar cobro'}
                  </button>
                </div>
              </>
            )}

            {pendingReceivables.length === 0 && (
              <button type="button" onClick={onClose} className="w-full py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                Cerrar
              </button>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
