import { useState, useMemo } from 'react'
import {
  ShoppingCart, Plus, CheckSquare, Square, X, Clock, AlertCircle,
} from 'lucide-react'
import { PageHeader, Card, ConfirmDialog } from '@/components/ui'
import { AddPurchaseModal }    from '@/components/modals/AddPurchaseModal'
import { MarkPurchasedModal }  from '@/components/modals/MarkPurchasedModal'
import { usePurchases }        from '@/hooks/usePurchases'
import { purchasesService }    from '@/services/purchases.service'
import { useWorkspace }        from '@/context/WorkspaceContext'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import {
  PRIORITY_CLS, PRIORITY_LABEL, PURCHASE_CATEGORIES,
  type PurchaseItem, type PurchasePriority,
} from '@/types/purchases'

type FilterTab = 'all' | 'urgent' | 'week' | 'no-date' | 'done'

function dueDateLabel(dateStr?: string): { label: string; cls: string } | null {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due   = new Date(dateStr + 'T00:00:00'); due.setHours(0,0,0,0)
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (diff < 0)  return { label: `Vencido hace ${Math.abs(diff)} día${Math.abs(diff) > 1 ? 's' : ''}`, cls: 'text-red-400' }
  if (diff === 0) return { label: 'Hoy',     cls: 'text-amber-400' }
  if (diff === 1) return { label: 'Mañana',  cls: 'text-amber-400' }
  if (diff <= 7)  return { label: `En ${diff} días`, cls: 'text-content-secondary' }
  return { label: formatDate(dateStr), cls: 'text-content-muted' }
}

export function PurchasesPage() {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const { items, create, markPurchased, remove } = usePurchases()

  const [addOpen,       setAddOpen]       = useState(false)
  const [markOpen,      setMarkOpen]      = useState(false)
  const [selected,      setSelected]      = useState<PurchaseItem | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<PurchaseItem | null>(null)
  const [filterTab,     setFilterTab]     = useState<FilterTab>('all')
  const [filterPrio,    setFilterPrio]    = useState<PurchasePriority | ''>('')
  const [filterCat,     setFilterCat]     = useState('')

  // Derived metrics
  const pending   = items.filter(i => i.status === 'TODO' || i.status === 'PLANNED')
  const highPrio  = pending.filter(i => i.priority === 'HIGH' || i.priority === 'URGENT')
  const estimated = pending.reduce((s, i) => s + (i.estimatedAmount ?? 0), 0)
  const nextDue   = pending
    .filter(i => i.dueDate)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0]

  const today = new Date().toISOString().slice(0, 10)
  const in7   = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    let result = items
    if (filterTab === 'urgent') result = result.filter(i => (i.priority === 'HIGH' || i.priority === 'URGENT') && i.status !== 'PURCHASED' && i.status !== 'CANCELLED')
    else if (filterTab === 'week')    result = result.filter(i => i.dueDate && i.dueDate >= today && i.dueDate <= in7 && i.status !== 'PURCHASED' && i.status !== 'CANCELLED')
    else if (filterTab === 'no-date') result = result.filter(i => !i.dueDate && i.status !== 'PURCHASED' && i.status !== 'CANCELLED')
    else if (filterTab === 'done')    result = result.filter(i => i.status === 'PURCHASED' || i.status === 'CANCELLED')
    else                              result = result.filter(i => i.status !== 'PURCHASED' && i.status !== 'CANCELLED')

    if (filterPrio) result = result.filter(i => i.priority === filterPrio)
    if (filterCat)  result = result.filter(i => i.category === filterCat)
    return result
  }, [items, filterTab, filterPrio, filterCat, today, in7])

  async function handleMarkAndSave(id: string, data: { amount: number; accountId: string; categoryId: string; date: string; description: string }) {
    try {
      // Operación atómica: crea Transaction + marca PurchaseItem como PURCHASED
      await purchasesService.completeAsExpense({
        workspaceId: wsId,
        purchaseId:  id,
        accountId:   data.accountId,
        categoryId:  data.categoryId,
        amount:      data.amount,
        description: data.description,
        date:        data.date,
      })
      markPurchased(id) // invalida el cache de TanStack Query
    } catch {
      // Si RPC falla (p.ej. no tiene workspace_id), solo marcar como comprada
      markPurchased(id)
    }
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',     label: `Todo (${pending.length})` },
    { key: 'urgent',  label: `Urgente (${highPrio.length})` },
    { key: 'week',    label: 'Esta semana' },
    { key: 'no-date', label: 'Sin fecha' },
    { key: 'done',    label: 'Compradas' },
  ]

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      <PageHeader
        title="Por comprar"
        description="Organiza compras futuras sin afectar tus finanzas reales"
        actions={
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pendientes',      value: String(pending.length),              color: 'text-content-primary' },
          { label: 'Prioridad alta',  value: String(highPrio.length),             color: 'text-amber-400' },
          { label: 'Monto estimado',  value: estimated > 0 ? formatCurrency(estimated) : '—', color: 'text-content-secondary' },
          { label: 'Próxima compra',  value: nextDue?.dueDate ? formatDate(nextDue.dueDate) : '—', color: 'text-content-muted' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">{k.label}</p>
            <p className={cn('text-base font-bold', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1 border-b border-base-border w-full overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setFilterTab(t.key)}
              className={cn('px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                filterTab === t.key ? 'border-brand-500 text-brand-400' : 'border-transparent text-content-muted hover:text-content-primary'
              )}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Filtros secundarios */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterPrio} onChange={e => setFilterPrio(e.target.value as PurchasePriority | '')}
          className="text-xs px-2 py-1.5 rounded-lg border border-base-border bg-base-elevated text-content-muted">
          <option value="">Toda prioridad</option>
          {(['URGENT','HIGH','MEDIUM','LOW'] as PurchasePriority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
          ))}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg border border-base-border bg-base-elevated text-content-muted">
          <option value="">Toda categoría</option>
          {PURCHASE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterPrio || filterCat) && (
          <button onClick={() => { setFilterPrio(''); setFilterCat('') }}
            className="text-xs text-content-disabled hover:text-content-muted flex items-center gap-1">
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <ShoppingCart className="w-10 h-10 text-content-disabled mx-auto" />
          <p className="text-sm font-semibold text-content-primary">Sin compras en esta vista</p>
          <p className="text-xs text-content-muted">Usa el botón <strong>+ Agregar</strong> para registrar lo que necesitas comprar.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const dueInfo   = dueDateLabel(item.dueDate)
            const isPending = item.status === 'TODO' || item.status === 'PLANNED'

            return (
              <div key={item.id} className={cn(
                'rounded-xl border bg-base-surface p-4 transition-all hover:bg-base-hover',
                item.status === 'PURCHASED' ? 'border-emerald-500/20 opacity-70' : 'border-base-border'
              )}>
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => { if (!isPending) return; setSelected(item); setMarkOpen(true) }}
                    className={cn('flex-shrink-0 mt-0.5 transition-colors', isPending ? 'text-content-disabled hover:text-brand-400' : 'text-emerald-400')}
                  >
                    {isPending ? <Square className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-semibold', item.status === 'PURCHASED' ? 'line-through text-content-muted' : 'text-content-primary')}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide', PRIORITY_CLS[item.priority])}>
                          {PRIORITY_LABEL[item.priority]}
                        </span>
                        <button onClick={() => setDeleteTarget(item)} className="p-1 text-content-disabled hover:text-red-400 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-elevated border border-base-border text-content-disabled">
                        {item.category}
                      </span>
                      {item.estimatedAmount && (
                        <span className="text-xs font-semibold text-content-secondary tabular-nums">
                          {formatCurrency(item.estimatedAmount)}
                        </span>
                      )}
                      {dueInfo && (
                        <span className={cn('flex items-center gap-1 text-xs', dueInfo.cls)}>
                          <Clock className="w-3 h-3" />
                          {dueInfo.label}
                        </span>
                      )}
                      {item.reminderDate && (
                        <span className="flex items-center gap-1 text-xs text-content-disabled">
                          <AlertCircle className="w-3 h-3" />
                          Recordatorio {formatDate(item.reminderDate)}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-content-muted">{item.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddPurchaseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data) => create({ ...data, workspaceId: wsId })}
      />
      <MarkPurchasedModal
        open={markOpen}
        onClose={() => { setMarkOpen(false); setSelected(null) }}
        item={selected}
        onMarkOnly={markPurchased}
        onMarkAndSave={handleMarkAndSave}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar compra"
        description={`¿Eliminar "${deleteTarget?.title}" de la lista? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => { if (deleteTarget) { remove(deleteTarget.id); setDeleteTarget(null) } }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
