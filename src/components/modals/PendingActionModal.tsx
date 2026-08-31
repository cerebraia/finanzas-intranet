import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { supabase }                  from '@/lib/supabase'
import { useWorkspace }              from '@/context/WorkspaceContext'
import { useAccounts }               from '@/hooks/useAccounts'
import { useRegisterPayment }        from '@/hooks/useReceivables'
import { useRegisterDebtPayment }    from '@/hooks/useDebts'
import { useQueryClient }            from '@tanstack/react-query'
import { recurringExpensesService }  from '@/services/recurringExpenses.service'
import { payrollService }            from '@/services/payroll.service'
import { mapSupabaseError }          from '@/lib/errorMap'
import { formatCurrency, cn }        from '@/lib/utils'
import { toast }                     from 'sonner'
import type { PendingItem }          from '@/types/api'

interface Props {
  open:    boolean
  onClose: () => void
  item:    PendingItem | null
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

function ActionLabel(sourceType: string, direction: string) {
  if (sourceType === 'RECEIVABLE') return 'Confirmar cobro'
  if (sourceType === 'PAYROLL')    return 'Confirmar pago nómina'
  if (sourceType === 'RECURRING_EXPENSE') return 'Confirmar pago gasto fijo'
  if (sourceType === 'DEBT')       return 'Confirmar pago cuota'
  return direction === 'INCOMING' ? 'Confirmar cobro' : 'Confirmar pago'
}

export function PendingActionModal({ open, onClose, item }: Props) {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id
  const qc   = useQueryClient()

  const [amount,    setAmount]    = useState('')
  const [accountId, setAccountId] = useState('')
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [notes,     setNotes]     = useState('')
  const [loading,   setLoading]   = useState(false)

  const { data: accounts = [] } = useAccounts(wsId)
  const registerReceivable   = useRegisterPayment()
  const registerDebtPayment  = useRegisterDebtPayment()

  const maxAmount = item?.pendingAmount ?? 0

  useEffect(() => {
    if (open && item) {
      setAmount(item.pendingAmount.toFixed(2))
      setAccountId('')
      setDate(new Date().toISOString().slice(0, 10))
      setReference('')
      setNotes('')
    }
  }, [open, item])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!item || !accountId) return

    setLoading(true)
    try {
      const amt = Number(amount)

      if (item.sourceType === 'RECEIVABLE') {
        const { data: recv } = await supabase.from('receivables').select('client_id').eq('id', item.entityId).single()
        const clientId = (recv as { client_id: string } | null)?.client_id ?? ''
        await registerReceivable.mutateAsync({
          receivableId: item.entityId,
          data: {
            workspaceId:    wsId,
            clientId,
            accountId,
            amount:         amt,
            paymentDate:    date,
            reference:      reference || undefined,
            notes:          notes     || undefined,
            idempotencyKey: crypto.randomUUID(),
          },
        })
      } else if (item.sourceType === 'PAYROLL') {
        await payrollService.payObligationById(item.entityId, wsId, {
          accountId,
          amount:         amt,
          paymentDate:    date,
          reference:      reference || undefined,
          notes:          notes     || undefined,
          idempotencyKey: crypto.randomUUID(),
        })
        qc.invalidateQueries({ queryKey: ['payroll-obligations'] })
        qc.invalidateQueries({ queryKey: ['pending-items'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['accounts', wsId] })
        qc.invalidateQueries({ queryKey: ['commitment-summary'] })
        toast.success('Pago de nómina registrado')
      } else if (item.sourceType === 'RECURRING_EXPENSE') {
        await recurringExpensesService.payObligationById(item.entityId, wsId, {
          accountId,
          paymentDate: date,
          reference:   reference || undefined,
        })
        qc.invalidateQueries({ queryKey: ['pending-items'] })
        qc.invalidateQueries({ queryKey: ['recurring-expenses'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['accounts', wsId] })
        qc.invalidateQueries({ queryKey: ['commitment-summary'] })
        toast.success('Pago registrado')
      } else if (item.sourceType === 'DEBT') {
        await registerDebtPayment.mutateAsync({
          installmentId: item.entityId,
          data: {
            workspaceId:     wsId,
            debtId:          '',
            installmentId:   item.entityId,
            accountId,
            amount:          amt,
            paymentDate:     date,
            reference:       reference || undefined,
            notes:           notes     || undefined,
            idempotencyKey:  crypto.randomUUID(),
          },
        })
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? mapSupabaseError(err) : 'No pudimos registrar el pago.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!item) return null

  const isIncoming = item.direction === 'INCOMING'
  const btnCls = isIncoming
    ? 'bg-emerald-600 hover:bg-emerald-500'
    : 'bg-brand-600 hover:bg-brand-500'

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
              <Dialog.Title className="text-sm font-semibold text-content-primary">
                {isIncoming ? 'Registrar cobro' : 'Registrar pago'}
              </Dialog.Title>
              <p className="text-xs text-content-muted mt-0.5">{item.title}</p>
            </div>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div className="rounded-lg bg-base-elevated border border-base-border p-3 text-xs space-y-0.5">
              <p className="text-content-muted">{item.description}</p>
              <div className="flex justify-between mt-1">
                <span className="text-content-muted">Pendiente:</span>
                <span className={cn('font-semibold', isIncoming ? 'text-emerald-400' : 'text-amber-400')}>
                  {formatCurrency(maxAmount)}
                </span>
              </div>
            </div>

            {item.sourceType !== 'RECURRING_EXPENSE' && (
              <div>
                <label className={labelCls}>Monto *</label>
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
                <p className="text-[10px] text-content-disabled mt-1">Máximo: {formatCurrency(maxAmount)}</p>
              </div>
            )}

            <div>
              <label className={labelCls}>Cuenta {isIncoming ? 'destino' : 'de origen'} *</label>
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
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Número de transacción..." className={inputCls} />
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
                disabled={loading || !accountId}
                className={cn('flex-1 py-2 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-50', btnCls)}
              >
                {loading ? 'Registrando...' : ActionLabel(item.sourceType, item.direction)}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
