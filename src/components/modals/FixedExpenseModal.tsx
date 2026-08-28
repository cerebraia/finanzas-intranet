import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useCreateRecurringExpense, useUpdateRecurringExpense } from '@/hooks/useRecurringExpenses'
import { cn } from '@/lib/utils'
import type { ApiRecurringExpense } from '@/types/api'

interface FixedExpenseModalProps {
  open:    boolean
  onClose: () => void
  editing?: ApiRecurringExpense | null
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

export function FixedExpenseModal({ open, onClose, editing }: FixedExpenseModalProps) {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const [name,       setName]       = useState('')
  const [amount,     setAmount]     = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentDay, setPaymentDay] = useState('')
  const [accountId,  setAccountId]  = useState('')
  const [startDate,  setStartDate]  = useState(new Date().toISOString().slice(0, 7) + '-01')
  const [notes,      setNotes]      = useState('')

  const { data: accounts   = [] } = useAccounts(wsId)
  const { data: categories = [] } = useCategories()
  const createExpense = useCreateRecurringExpense()
  const updateExpense = useUpdateRecurringExpense()

  const isEditing = !!editing

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name)
        setAmount(String(Number(editing.amount)))
        setCategoryId(editing.categoryId)
        setPaymentDay(String(editing.paymentDay))
        setAccountId(editing.accountId ?? '')
        setStartDate(editing.startDate)
        setNotes(editing.notes ?? '')
      } else {
        setName(''); setAmount(''); setCategoryId(''); setPaymentDay('')
        setAccountId(''); setStartDate(new Date().toISOString().slice(0, 7) + '-01'); setNotes('')
      }
    }
  }, [open, editing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEditing && editing) {
      await updateExpense.mutateAsync({
        id: editing.id,
        workspaceId: wsId,
        data: {
          name,
          amount:     Number(amount),
          categoryId,
          paymentDay: Number(paymentDay),
          accountId:  accountId || undefined,
          notes:      notes || undefined,
        },
      })
    } else {
      await createExpense.mutateAsync({
        workspaceId: wsId,
        name,
        amount:      Number(amount),
        categoryId,
        frequency:   'MONTHLY',
        paymentDay:  Number(paymentDay),
        accountId:   accountId || undefined,
        startDate,
        notes:       notes || undefined,
      })
    }
    onClose()
  }

  const isPending = createExpense.isPending || updateExpense.isPending

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={cn(
          'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-md',
          'bg-base-surface border border-base-border rounded-2xl shadow-glow animate-fade-in focus:outline-none'
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
            <Dialog.Title className="text-sm font-semibold text-content-primary">
              {isEditing ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}
            </Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: ChatGPT, Claude, Internet..." className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Monto (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                  <input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={cn(inputCls, 'pl-6')} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Día de pago *</label>
                <input required type="number" min="1" max="31" value={paymentDay} onChange={e => setPaymentDay(e.target.value)} placeholder="Ej: 25" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Categoría *</label>
              <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">Seleccionar categoría</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Cuenta por defecto (opcional)</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className={inputCls}>
                <option value="">Sin cuenta predeterminada</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {!isEditing && (
              <div>
                <label className={labelCls}>Fecha de inicio *</label>
                <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </div>
            )}

            <div>
              <label className={labelCls}>Notas (opcional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..." className={inputCls} />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar gasto fijo'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
