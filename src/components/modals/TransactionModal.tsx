import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ChevronDown } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions'
import { cn } from '@/lib/utils'
import type { ApiTransaction, TransactionType, TransactionStatus } from '@/types/api'

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  defaultType?: TransactionType
  editingTransaction?: ApiTransaction | null
}

const today = () => new Date().toISOString().slice(0, 10)

export function TransactionModal({ open, onClose, defaultType = 'EXPENSE', editingTransaction }: TransactionModalProps) {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const [type, setType]               = useState<TransactionType>(defaultType)
  const [amount, setAmount]           = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId]   = useState('')
  const [accountId, setAccountId]     = useState('')
  const [date, setDate]               = useState(today())
  const [status, setStatus]           = useState<TransactionStatus>('COMPLETED')
  const [notes, setNotes]             = useState('')
  const [showMore, setShowMore]       = useState(false)

  const { data: categories = [] } = useCategories(wsId, type)
  const { data: accounts = [] }   = useAccounts(wsId)
  const createTx  = useCreateTransaction()
  const updateTx  = useUpdateTransaction()

  const isEditing = !!editingTransaction

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type)
      setAmount(String(Number(editingTransaction.amount)))
      setDescription(editingTransaction.description)
      setCategoryId(editingTransaction.categoryId)
      setAccountId(editingTransaction.accountId)
      setDate(editingTransaction.transactionDate.slice(0, 10))
      setStatus(editingTransaction.status)
      setNotes(editingTransaction.notes ?? '')
    } else {
      setType(defaultType)
      setAmount('')
      setDescription('')
      setCategoryId('')
      setAccountId('')
      setDate(today())
      setStatus('COMPLETED')
      setNotes('')
    }
    setShowMore(false)
  }, [open, editingTransaction, defaultType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      workspaceId:     wsId,
      accountId,
      categoryId,
      type,
      amount:          Number(amount),
      description,
      transactionDate: date,
      status,
      notes:           notes || undefined,
    }

    if (isEditing && editingTransaction) {
      await updateTx.mutateAsync({ id: editingTransaction.id, workspaceId: wsId, data: payload })
    } else {
      await createTx.mutateAsync(payload)
    }
    onClose()
  }

  const inputCls = cn(
    'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
    'text-sm text-content-primary placeholder:text-content-disabled',
    'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60',
    'transition-colors duration-150'
  )
  const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

  const isPending = createTx.isPending || updateTx.isPending

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)] max-w-md',
            'bg-base-surface border border-base-border rounded-2xl shadow-glow',
            'animate-fade-in focus:outline-none'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
            <Dialog.Title className="text-sm font-semibold text-content-primary">
              {isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}
            </Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* Tipo toggle */}
            <div className="flex rounded-lg overflow-hidden border border-base-border">
              {(['INCOME', 'EXPENSE'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setCategoryId('') }}
                  className={cn(
                    'flex-1 py-2 text-sm font-semibold transition-all duration-150',
                    type === t
                      ? t === 'INCOME'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-base-elevated text-content-muted hover:text-content-secondary',
                  )}
                >
                  {t === 'INCOME' ? 'Ingreso' : 'Gasto'}
                </button>
              ))}
            </div>

            {/* Monto */}
            <div>
              <label className={labelCls}>Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={cn(inputCls, 'pl-6')}
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className={labelCls}>Descripción *</label>
              <input
                required
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Supermercado, salario..."
                className={inputCls}
              />
            </div>

            {/* Categoría */}
            <div>
              <label className={labelCls}>Categoría *</label>
              <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">Seleccionar categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Cuenta */}
            <div>
              <label className={labelCls}>Cuenta *</label>
              <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
                <option value="">Seleccionar cuenta</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Fecha + Estado en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha *</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Estado</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus)} className={inputCls}>
                  <option value="COMPLETED">Completado</option>
                  <option value="PENDING">Pendiente</option>
                </select>
              </div>
            </div>

            {/* Más opciones */}
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-secondary transition-colors"
            >
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showMore && 'rotate-180')} />
              {showMore ? 'Menos opciones' : 'Más opciones'}
            </button>

            {showMore && (
              <div className="animate-fade-in">
                <label className={labelCls}>Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales (opcional)..."
                  className={cn(inputCls, 'resize-none')}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'flex-1 py-2 rounded-lg border border-base-border text-sm font-medium',
                  'text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors'
                )}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                  'bg-brand-600 hover:bg-brand-500 text-white shadow-glow-sm',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar movimiento'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
