import { useState } from 'react'
import { FileText, Plus, DollarSign, Zap, AlertCircle } from 'lucide-react'
import { PageHeader, Card, Badge } from '@/components/ui'
import { FixedExpenseModal } from '@/components/modals/FixedExpenseModal'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useRecurringExpenses, usePayRecurringExpense, useGenerateRecurring } from '@/hooks/useRecurringExpenses'
import { useAccounts } from '@/hooks/useAccounts'
import { formatCurrency, cn } from '@/lib/utils'
import type { ApiRecurringExpense } from '@/types/api'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

function PayFixedExpenseModal({
  open, onClose, expense, workspaceId,
}: {
  open: boolean; onClose: () => void; expense: ApiRecurringExpense | null; workspaceId: string
}) {
  const now = new Date()
  const [month, setMonth]     = useState(String(now.getMonth() + 1))
  const [year, setYear]       = useState(String(now.getFullYear()))
  const [accountId, setAccountId] = useState('')
  const [date, setDate]       = useState(now.toISOString().slice(0, 10))
  const [reference, setRef]   = useState('')
  const { data: accounts = [] } = useAccounts(workspaceId)
  const payExpense = usePayRecurringExpense()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!expense) return
    await payExpense.mutateAsync({
      id: expense.id,
      workspaceId,
      data: { month: Number(month), year: Number(year), accountId, paymentDate: date, reference: reference || undefined },
    })
    onClose()
  }

  if (!expense) return null

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
            <Dialog.Title className="text-sm font-semibold text-content-primary">Pagar gasto fijo</Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div className="rounded-lg bg-base-elevated border border-base-border p-3">
              <p className="text-sm font-semibold text-content-primary">{expense.name}</p>
              <p className="text-xs text-content-muted mt-0.5">{formatCurrency(Number(expense.amount))} / mes</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mes *</label>
                <select required value={month} onChange={e => setMonth(e.target.value)} className={inputCls}>
                  {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Año *</label>
                <input required type="number" value={year} onChange={e => setYear(e.target.value)} className={inputCls} />
              </div>
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
              <input value={reference} onChange={e => setRef(e.target.value)} placeholder="Número de transacción" className={inputCls} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={payExpense.isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                {payExpense.isPending ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function FixedExpensesPage() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const wsId = activeWorkspace.id

  const [newModal, setNewModal]   = useState(false)
  const [payModal, setPayModal]   = useState(false)
  const [selected, setSelected]   = useState<ApiRecurringExpense | null>(null)

  const { data: expenses = [], isLoading, isError, refetch } = useRecurringExpenses(wsId)
  const generateRecurring = useGenerateRecurring()

  const totalMonthly = expenses.reduce((s, e) => s + Number(e.amount), 0)

  function openPay(exp: ApiRecurringExpense) {
    setSelected(exp)
    setPayModal(true)
  }

  function handleGenerate() {
    const m = dateRange.from.getMonth() + 1
    const y = dateRange.from.getFullYear()
    generateRecurring.mutate({ workspaceId: wsId, month: m, year: y })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gastos Fijos"
        description={`Compromisos recurrentes de ${activeWorkspace.name}`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generateRecurring.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-base-border text-xs font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Generar mes
            </button>
            <button
              onClick={() => setNewModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo gasto fijo
            </button>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-base-border bg-base-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">Gastos activos</p>
          <p className="text-xl font-bold text-content-primary">{expenses.length}</p>
        </div>
        <div className="rounded-xl border border-base-border bg-base-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">Total mensual</p>
          <p className="text-xl font-bold text-content-primary tabular-nums">{formatCurrency(totalMonthly)}</p>
        </div>
      </div>

      {/* Lista */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-content-muted text-sm">Cargando gastos fijos...</div>
        ) : isError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm font-semibold text-content-primary">No pudimos cargar esta información</p>
            <p className="text-xs text-content-muted">Verifica tu conexión e intenta de nuevo.</p>
            <button onClick={() => refetch()} className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors">
              Reintentar
            </button>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-content-disabled mx-auto" />
            <p className="text-sm text-content-muted">No hay gastos fijos configurados.</p>
            <button onClick={() => setNewModal(true)} className="text-xs text-brand-400 hover:text-brand-300">
              + Agregar gasto fijo
            </button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-border">
                    {['Nombre', 'Monto', 'Categoría', 'Día', 'Cuenta', 'Estado', 'Acción'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-border">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-base-hover transition-colors">
                      <td className="px-4 py-3 font-medium text-content-primary">{exp.name}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(Number(exp.amount))}</td>
                      <td className="px-4 py-3 text-content-muted text-xs">{exp.category.name}</td>
                      <td className="px-4 py-3 text-content-muted">Día {exp.paymentDay}</td>
                      <td className="px-4 py-3 text-content-muted text-xs">{exp.account?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={exp.isActive ? 'success' : 'default'}>{exp.isActive ? 'Activo' : 'Inactivo'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openPay(exp)} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                          <DollarSign className="w-3 h-3" /> Pagar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-base-border">
              {expenses.map(exp => (
                <div key={exp.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-content-primary text-sm">{exp.name}</p>
                    <p className="text-xs text-content-muted">{exp.category.name} — Día {exp.paymentDay}</p>
                    <p className="text-xs font-semibold text-content-primary mt-0.5">{formatCurrency(Number(exp.amount))}</p>
                  </div>
                  <button
                    onClick={() => openPay(exp)}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all"
                  >
                    Pagar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <FixedExpenseModal open={newModal} onClose={() => setNewModal(false)} />
      <PayFixedExpenseModal
        open={payModal}
        onClose={() => { setPayModal(false); setSelected(null) }}
        expense={selected}
        workspaceId={wsId}
      />
    </div>
  )
}
