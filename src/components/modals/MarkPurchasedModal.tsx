import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, CheckCircle2, ShoppingBag } from 'lucide-react'
import { useWorkspace }  from '@/context/WorkspaceContext'
import { useAccounts }   from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency, cn } from '@/lib/utils'
import type { PurchaseItem } from '@/types/purchases'

interface MarkPurchasedModalProps {
  open:    boolean
  onClose: () => void
  item:    PurchaseItem | null
  onMarkOnly:    (id: string) => void
  onMarkAndSave: (id: string, data: { amount: number; accountId: string; categoryId: string; date: string; description: string }) => void
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

type Step = 'confirm' | 'expense'

export function MarkPurchasedModal({ open, onClose, item, onMarkOnly, onMarkAndSave }: MarkPurchasedModalProps) {
  const [step,       setStep]       = useState<Step>('confirm')
  const [amount,     setAmount]     = useState('')
  const [accountId,  setAccountId]  = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10))

  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id
  const { data: accounts   = [] } = useAccounts(wsId)
  const { data: categories = [] } = useCategories()
  const expCats = categories.filter(c => c.type === 'EXPENSE')

  function reset() { setStep('confirm'); setAmount(''); setAccountId(''); setCategoryId(''); setDate(new Date().toISOString().slice(0, 10)) }
  function handleClose() { reset(); onClose() }

  function handleMarkOnly() {
    if (!item) return
    onMarkOnly(item.id)
    handleClose()
  }

  function handleExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!item) return
    onMarkAndSave(item.id, {
      amount:      Number(amount),
      accountId,
      categoryId,
      date,
      description: `${item.title} — ${item.category}`,
    })
    handleClose()
  }

  if (!item) return null

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && handleClose()}>
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
                {step === 'confirm' ? 'Compra completada' : 'Registrar gasto'}
              </Dialog.Title>
              <p className="text-xs text-content-muted mt-0.5">{item.title}</p>
            </div>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          {step === 'confirm' ? (
            <div className="px-5 py-5 space-y-4">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-content-primary">¡Listo!</p>
                  <p className="text-xs text-content-muted mt-0.5">¿Quieres registrar esta compra como gasto financiero?</p>
                  {item.estimatedAmount && (
                    <p className="text-xs text-content-muted mt-0.5">Estimado: {formatCurrency(item.estimatedAmount)}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setStep('expense')}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> Sí, registrar gasto
                </button>
                <button
                  onClick={handleMarkOnly}
                  className="w-full py-2.5 rounded-xl border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
                >
                  Marcar como comprada solamente
                </button>
                <button
                  onClick={handleClose}
                  className="w-full py-2 text-xs text-content-disabled hover:text-content-muted transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleExpense} className="px-5 py-4 space-y-4">
              <div>
                <label className={labelCls}>Monto real pagado *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                  <input required type="number" min="0.01" step="0.01"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder={item.estimatedAmount ? String(item.estimatedAmount) : '0.00'}
                    className={cn(inputCls, 'pl-6')} />
                </div>
                {item.estimatedAmount && (
                  <p className="text-[10px] text-content-disabled mt-1">Estimado: {formatCurrency(item.estimatedAmount)}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Cuenta *</label>
                <select required value={accountId} onChange={e => setAccountId(e.target.value)} className={inputCls}>
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Categoría financiera *</label>
                <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
                  <option value="">Seleccionar categoría</option>
                  {expCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Fecha de compra *</label>
                <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setStep('confirm')} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                  ← Atrás
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all">
                  Registrar compra y gasto
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
