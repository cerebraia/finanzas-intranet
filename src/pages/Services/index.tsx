import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X, Pencil, ToggleLeft, ToggleRight, Package } from 'lucide-react'
import { PageHeader } from '@/components/ui'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useBusinessServices } from '@/hooks/useBusinessServices'
import { formatCurrency, cn } from '@/lib/utils'
import { BILLING_MODE_LABEL } from '@/services/businessServices.service'
import type { BusinessService, BillingMode } from '@/services/businessServices.service'

const BILLING_MODES: BillingMode[] = ['MONTHLY','QUARTERLY','YEARLY','ONE_TIME','CUSTOM']

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

// ─── Service Form Modal ───────────────────────────────────────────────────────

function ServiceModal({
  open, onClose, workspaceId, editing,
}: {
  open: boolean
  onClose: () => void
  workspaceId: string
  editing: BusinessService | null
}) {
  const { create, update } = useBusinessServices(true)
  const [loading, setLoading] = useState(false)

  const [name,        setName]        = useState(editing?.name        ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [basePrice,   setBasePrice]   = useState(String(editing?.basePrice ?? ''))
  const [currency,    setCurrency]    = useState(editing?.currency    ?? 'USD')
  const [billingMode, setBillingMode] = useState<BillingMode>(editing?.billingMode ?? 'MONTHLY')
  const [category,    setCategory]    = useState(editing?.category    ?? '')

  function reset() {
    setName(''); setDescription(''); setBasePrice('')
    setCurrency('USD'); setBillingMode('MONTHLY'); setCategory('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) {
        await update(editing.id, {
          name, description: description || null, basePrice: Number(basePrice),
          currency, billingMode, category: category || null,
        })
      } else {
        await create({
          workspaceId, name, description: description || undefined,
          basePrice: Number(basePrice), currency, billingMode,
          category: category || undefined,
        })
        reset()
      }
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed z-50 inset-0 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-base-border bg-base-surface p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-bold text-content-primary">
                {editing ? 'Editar servicio' : 'Nuevo servicio'}
              </Dialog.Title>
              <button onClick={onClose} className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Ej: Meta Ads" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Descripción</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Descripción opcional..." rows={2}
                  className={cn(inputCls, 'resize-none')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Precio base *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                    <input required type="number" min="0" step="0.01" value={basePrice}
                      onChange={e => setBasePrice(e.target.value)}
                      placeholder="0.00" className={cn(inputCls, 'pl-6')} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Moneda</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
                    <option value="USD">USD</option>
                    <option value="VES">VES</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Modalidad de cobro</label>
                <select value={billingMode} onChange={e => setBillingMode(e.target.value as BillingMode)} className={inputCls}>
                  {BILLING_MODES.map(m => (
                    <option key={m} value={m}>{BILLING_MODE_LABEL[m]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Categoría</label>
                <input value={category} onChange={e => setCategory(e.target.value)}
                  placeholder="Ej: Pauta, Desarrollo, Consultoría..." className={inputCls} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading || !name.trim() || !basePrice}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear servicio'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ServicesPage() {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id
  const [showInactive, setShowInactive] = useState(false)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editing,      setEditing]      = useState<BusinessService | null>(null)

  const { services, isLoading, toggle } = useBusinessServices(showInactive)

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(svc: BusinessService) { setEditing(svc); setModalOpen(true) }

  const activeCount = services.filter(s => s.isActive).length

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      <PageHeader
        title="Servicios"
        description={`${activeCount} servicio${activeCount !== 1 ? 's' : ''} activo${activeCount !== 1 ? 's' : ''}`}
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo servicio
          </button>
        }
      />

      {/* Toggle inactive */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowInactive(v => !v)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
            showInactive
              ? 'bg-brand-600/20 text-brand-400 border-brand-600/30'
              : 'border-base-border text-content-muted hover:text-content-primary'
          )}
        >
          {showInactive ? 'Ocultar inactivos' : 'Mostrar inactivos'}
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-base-border bg-base-surface animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-border bg-base-surface/50 p-12 text-center">
          <Package className="w-8 h-8 text-content-disabled mx-auto mb-3" />
          <p className="text-sm font-medium text-content-muted mb-1">Sin servicios registrados</p>
          <p className="text-xs text-content-disabled mb-4">Agrega los servicios que ofreces</p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">
            <Plus className="w-4 h-4" />
            Crear primer servicio
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-base-border bg-base-surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wider hidden md:table-cell">Precio base</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wider hidden sm:table-cell">Frecuencia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wider hidden lg:table-cell">Categoría</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-content-muted uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {services.map(svc => (
                <tr key={svc.id} className={cn('hover:bg-base-hover/30 transition-colors', !svc.isActive && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-content-primary">{svc.name}</p>
                    {svc.description && (
                      <p className="text-xs text-content-muted line-clamp-1">{svc.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm font-semibold text-content-primary tabular-nums">
                      {formatCurrency(svc.basePrice)}
                    </p>
                    <p className="text-xs text-content-muted">{svc.currency}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-400 font-medium">
                      {BILLING_MODE_LABEL[svc.billingMode]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-xs text-content-muted">{svc.category ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      svc.isActive
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-base-elevated text-content-disabled'
                    )}>
                      {svc.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(svc)}
                        className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
                        title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggle(svc.id, !svc.isActive)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          svc.isActive
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-content-disabled hover:text-emerald-400 hover:bg-emerald-500/10'
                        )}
                        title={svc.isActive ? 'Desactivar' : 'Activar'}>
                        {svc.isActive
                          ? <ToggleRight className="w-4 h-4" />
                          : <ToggleLeft  className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ServiceModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        workspaceId={wsId}
        editing={editing}
      />
    </div>
  )
}
