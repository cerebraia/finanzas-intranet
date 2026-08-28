import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useCreateClient, useUpdateClient, useAddClientService, useServiceCatalog } from '@/hooks/useClients'
import { cn } from '@/lib/utils'
import type { ApiClient } from '@/types/api'

interface ClientModalProps {
  open: boolean
  onClose: () => void
  editingClient?: ApiClient | null
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

export function ClientModal({ open, onClose, editingClient }: ClientModalProps) {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const [name, setName]               = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail]             = useState('')
  const [phone, setPhone]             = useState('')
  const [notes, setNotes]             = useState('')
  const [showService, setShowService] = useState(false)
  // Service fields
  const [serviceId, setServiceId]     = useState('')
  const [price, setPrice]             = useState('')
  const [billingDay, setBillingDay]   = useState('15')
  const [startDate, setStartDate]     = useState(new Date().toISOString().slice(0, 10))

  const { data: catalog = [] } = useServiceCatalog(wsId)
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const addService   = useAddClientService()

  const isEditing = !!editingClient

  useEffect(() => {
    if (editingClient) {
      setName(editingClient.name)
      setCompanyName(editingClient.companyName ?? '')
      setEmail(editingClient.email ?? '')
      setPhone(editingClient.phone ?? '')
      setNotes(editingClient.notes ?? '')
    } else {
      setName(''); setCompanyName(''); setEmail(''); setPhone(''); setNotes('')
    }
    setShowService(false)
    setServiceId(''); setPrice(''); setBillingDay('15')
    setStartDate(new Date().toISOString().slice(0, 10))
  }, [open, editingClient])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clientData = { workspaceId: wsId, name, companyName: companyName || undefined, email: email || undefined, phone: phone || undefined, notes: notes || undefined }

    if (isEditing && editingClient) {
      await updateClient.mutateAsync({ id: editingClient.id, workspaceId: wsId, data: clientData })
    } else {
      const newClient = await createClient.mutateAsync(clientData)
      if (showService && serviceId && price) {
        await addService.mutateAsync({
          clientId: newClient.id,
          workspaceId: wsId,
          data: { serviceId, price: Number(price), billingDay: Number(billingDay), startDate },
        })
      }
    }
    onClose()
  }

  const isPending = createClient.isPending || updateClient.isPending || addService.isPending

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={cn(
          'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-lg',
          'bg-base-surface border border-base-border rounded-2xl shadow-glow animate-fade-in focus:outline-none'
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
            <Dialog.Title className="text-sm font-semibold text-content-primary">
              {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
            </Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Nombre *</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del cliente" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Empresa</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Razón social" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+58 412..." className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ejemplo.com" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas opcionales..." className={cn(inputCls, 'resize-none')} />
              </div>
            </div>

            {!isEditing && (
              <div className="border-t border-base-border pt-4">
                <button type="button" onClick={() => setShowService(!showService)}
                  className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  {showService ? 'Quitar servicio' : 'Agregar servicio ahora'}
                </button>

                {showService && (
                  <div className="mt-3 space-y-3 animate-fade-in">
                    <div>
                      <label className={labelCls}>Servicio</label>
                      <select value={serviceId} onChange={e => {
                        const id = e.target.value
                        setServiceId(id)
                        const svc = catalog.find(s => s.id === id)
                        if (svc && !price) setPrice(String(svc.basePrice))
                      }} className={inputCls}>
                        <option value="">Seleccionar servicio</option>
                        {catalog.map(s => <option key={s.id} value={s.id}>{s.name} — ${s.basePrice}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Precio personalizado</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                          <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={cn(inputCls, 'pl-6')} />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Día de cobro</label>
                        <input type="number" min="1" max="31" value={billingDay} onChange={e => setBillingDay(e.target.value)} className={inputCls} />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Fecha de inicio</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear cliente'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
