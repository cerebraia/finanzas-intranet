import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Target, Plus, X, AlertTriangle, CheckCircle2, AlertCircle, TrendingDown } from 'lucide-react'
import { PageHeader, Card, EmptyState, Skeleton } from '@/components/ui'
import { useWorkspace }                  from '@/context/WorkspaceContext'
import { useCategories }                 from '@/hooks/useCategories'
import { useBudgetStatus, useCreateBudget, useDeactivateBudget, useGoalProgress, useCreateGoal, useAddGoalContribution } from '@/hooks/useAnalytics'
import { formatCurrency, cn } from '@/lib/utils'
import type { BudgetStatus }             from '@/services/analytics.service'
import type { BudgetPeriodType }         from '@/services/budgets.service'

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

const STATUS_CLS: Record<BudgetStatus['status'], string> = {
  SAFE:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  WARNING:  'bg-amber-500/10  text-amber-400  border-amber-500/20',
  CRITICAL: 'bg-red-500/10   text-red-400    border-red-500/20',
  EXCEEDED: 'bg-red-500/20   text-red-300    border-red-500/40',
}
const STATUS_LABEL: Record<BudgetStatus['status'], string> = {
  SAFE: 'Bien', WARNING: 'Atención', CRITICAL: 'Crítico', EXCEEDED: 'Excedido',
}
const STATUS_ICON: Record<BudgetStatus['status'], typeof CheckCircle2> = {
  SAFE: CheckCircle2, WARNING: AlertTriangle, CRITICAL: AlertCircle, EXCEEDED: AlertCircle,
}

const BAR_CLS: Record<BudgetStatus['status'], string> = {
  SAFE: 'bg-emerald-500', WARNING: 'bg-amber-500', CRITICAL: 'bg-red-500', EXCEEDED: 'bg-red-600',
}

function periodLabel(from: string, to: string) {
  return `${from} → ${to}`
}

function NewBudgetModal({ open, onClose, workspaceId }: { open: boolean; onClose: () => void; workspaceId: string }) {
  const now = new Date()
  const [name,        setName]       = useState('')
  const [amount,      setAmount]     = useState('')
  const [categoryId,  setCategoryId] = useState('')
  const [periodType] = useState<BudgetPeriodType>('MONTHLY')
  const [startDate,   setStart]      = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [endDate,     setEnd]        = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10))
  const [alertPct,    setAlertPct]   = useState('80')

  const { data: categories = [] } = useCategories(workspaceId, 'EXPENSE')
  const createBudget = useCreateBudget()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !amount) return
    await createBudget.mutateAsync({
      workspaceId,
      name,
      amount:          Number(amount),
      categoryId:      categoryId || undefined,
      periodType,
      startDate,
      endDate,
      alertThreshold:  Number(alertPct),
    })
    setName(''); setAmount(''); setCategoryId(''); setAlertPct('80')
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md bg-base-surface border border-base-border rounded-2xl shadow-glow focus:outline-none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
            <Dialog.Title className="text-sm font-semibold text-content-primary">Nuevo presupuesto</Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"><X className="w-4 h-4" /></Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div><label className={labelCls}>Nombre *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Gastos de transporte" className={inputCls} /></div>
            <div><label className={labelCls}>Monto límite *</label>
              <input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={inputCls} /></div>
            <div><label className={labelCls}>Categoría (opcional — vacío = presupuesto general)</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">Todos los gastos</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Desde *</label>
                <input type="date" required value={startDate} onChange={e => setStart(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Hasta *</label>
                <input type="date" required value={endDate} onChange={e => setEnd(e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Alerta al %</label>
              <input type="number" min="1" max="100" value={alertPct} onChange={e => setAlertPct(e.target.value)} className={inputCls} /></div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary transition-colors">Cancelar</button>
              <button type="submit" disabled={createBudget.isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-60">
                {createBudget.isPending ? 'Creando...' : 'Crear presupuesto'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function NewGoalModal({ open, onClose, workspaceId }: { open: boolean; onClose: () => void; workspaceId: string }) {
  const [name,    setName]    = useState('')
  const [amount,  setAmount]  = useState('')
  const [desc,    setDesc]    = useState('')
  const [date,    setDate]    = useState('')
  const createGoal = useCreateGoal()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createGoal.mutateAsync({ workspaceId, name, targetAmount: Number(amount), description: desc || undefined, targetDate: date || undefined })
    setName(''); setAmount(''); setDesc(''); setDate(''); onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md bg-base-surface border border-base-border rounded-2xl shadow-glow focus:outline-none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
            <Dialog.Title className="text-sm font-semibold text-content-primary">Nueva meta financiera</Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"><X className="w-4 h-4" /></Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div><label className={labelCls}>Nombre *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Fondo de emergencia" className={inputCls} /></div>
            <div><label className={labelCls}>Objetivo ($) *</label>
              <input required type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000.00" className={inputCls} /></div>
            <div><label className={labelCls}>Descripción (opcional)</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Fecha objetivo (opcional)</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted">Cancelar</button>
              <button type="submit" disabled={createGoal.isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold disabled:opacity-60">
                {createGoal.isPending ? 'Creando...' : 'Crear meta'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function BudgetsPage() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const wsId = activeWorkspace.id

  const { data: budgets = [], isLoading: loadB, isError: errB, refetch: refetchB } = useBudgetStatus(wsId, dateRange.from, dateRange.to)
  const { data: goals   = [], isLoading: loadG } = useGoalProgress(wsId)
  const deactivate = useDeactivateBudget()
  const addContrib = useAddGoalContribution()

  const [newBudget, setNewBudget] = useState(false)
  const [newGoal,   setNewGoal]   = useState(false)
  const [contribGoalId, setContribGoalId] = useState<string | null>(null)
  const [contribAmount, setContribAmount] = useState('')

  const [tab, setTab] = useState<'presupuestos' | 'metas'>('presupuestos')

  async function handleContrib(e: React.FormEvent) {
    e.preventDefault()
    if (!contribGoalId || !contribAmount) return
    await addContrib.mutateAsync({ workspaceId: wsId, goalId: contribGoalId, amount: Number(contribAmount) })
    setContribGoalId(null); setContribAmount('')
  }

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      <PageHeader
        title="Presupuestos & Metas"
        description="Control de gastos y objetivos financieros"
        actions={
          <div className="flex gap-2">
            {tab === 'presupuestos' && (
              <button onClick={() => setNewBudget(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all">
                <Plus className="w-3.5 h-3.5" /> Nuevo presupuesto
              </button>
            )}
            {tab === 'metas' && (
              <button onClick={() => setNewGoal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all">
                <Plus className="w-3.5 h-3.5" /> Nueva meta
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-base-elevated border border-base-border">
        {[{ k: 'presupuestos', l: 'Presupuestos' }, { k: 'metas', l: 'Metas' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
            className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
              tab === t.k ? 'bg-base-surface text-content-primary shadow-sm' : 'text-content-muted hover:text-content-primary'
            )}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Presupuestos */}
      {tab === 'presupuestos' && (
        loadB ? <Skeleton className="h-40" /> : errB ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm font-semibold text-content-primary">No pudimos cargar esta información</p>
            <p className="text-xs text-content-muted">Verifica tu conexión e intenta de nuevo.</p>
            <button onClick={() => refetchB()} className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors">
              Reintentar
            </button>
          </div>
        ) : budgets.length === 0 ? (
          <EmptyState icon={Target} title="Sin presupuestos" description="Crea un presupuesto para controlar tus gastos." />
        ) : (
          <div className="space-y-3">
            {budgets.map(b => {
              const Icon = STATUS_ICON[b.status]
              return (
                <Card key={b.budgetId} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-content-primary text-sm">{b.budgetName}</p>
                      <p className="text-xs text-content-muted">{b.categoryName ?? 'General'} · {periodLabel(b.periodFrom, b.periodTo)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-medium', STATUS_CLS[b.status])}>
                        <Icon className="w-3 h-3" />{STATUS_LABEL[b.status]}
                      </span>
                      <button onClick={() => deactivate.mutate({ id: b.budgetId, workspaceId: wsId })}
                        className="text-[10px] text-content-disabled hover:text-red-400 transition-colors">
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-content-muted">Gastado: <strong className="text-content-primary">{formatCurrency(b.spent)}</strong></span>
                      <span className="text-content-muted">Límite: <strong className="text-content-primary">{formatCurrency(b.budgetAmount)}</strong></span>
                      <span className={cn('font-semibold', STATUS_CLS[b.status].split(' ')[1])}>{b.spentPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-base-elevated overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', BAR_CLS[b.status])}
                        style={{ width: `${Math.min(b.spentPct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-content-muted">
                      <span>Alerta al {b.alertThreshold}%</span>
                      <span>Restante: <strong className={b.remaining > 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(b.remaining)}</strong></span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* Metas */}
      {tab === 'metas' && (
        loadG ? <Skeleton className="h-40" /> : goals.length === 0 ? (
          <EmptyState icon={TrendingDown} title="Sin metas" description="Define objetivos de ahorro para mantenerte enfocado." />
        ) : (
          <div className="space-y-3">
            {goals.map(g => (
              <Card key={g.goalId} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-content-primary text-sm">{g.goalName}</p>
                    <p className="text-xs text-content-muted">
                      {g.targetDate ? `Objetivo: ${g.targetDate}` : 'Sin fecha límite'}
                      {g.daysRemaining != null && g.daysRemaining > 0 && ` · ${g.daysRemaining} días restantes`}
                    </p>
                  </div>
                  <button onClick={() => { setContribGoalId(g.goalId); setContribAmount('') }}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
                    + Aporte
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Ahorrado: <strong className="text-emerald-400">{formatCurrency(g.saved)}</strong></span>
                    <span>Objetivo: <strong className="text-content-primary">{formatCurrency(g.targetAmount)}</strong></span>
                    <span className="font-semibold text-brand-400">{g.progressPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-base-elevated overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${Math.min(g.progressPct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-content-muted">Faltan: <strong className="text-amber-400">{formatCurrency(g.remaining)}</strong></p>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Modal aporte de meta */}
      {contribGoalId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-base-surface border border-base-border rounded-2xl p-5 shadow-glow">
            <h3 className="text-sm font-semibold text-content-primary mb-4">Registrar aporte</h3>
            <form onSubmit={handleContrib} className="space-y-4">
              <div><label className={labelCls}>Monto aportado ($)</label>
                <input required type="number" min="0.01" step="0.01" value={contribAmount}
                  onChange={e => setContribAmount(e.target.value)} className={inputCls} /></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setContribGoalId(null)} className="flex-1 py-2 rounded-lg border border-base-border text-sm text-content-muted hover:text-content-primary transition-colors">Cancelar</button>
                <button type="submit" disabled={addContrib.isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold disabled:opacity-60">
                  {addContrib.isPending ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <NewBudgetModal open={newBudget} onClose={() => setNewBudget(false)} workspaceId={wsId} />
      <NewGoalModal   open={newGoal}   onClose={() => setNewGoal(false)}   workspaceId={wsId} />
    </div>
  )
}
