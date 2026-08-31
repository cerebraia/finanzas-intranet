import { useState } from 'react'
import { Users, Plus, Pencil, ExternalLink, TrendingUp, Clock, DollarSign, AlertCircle, Archive, Trash2, CircleDollarSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, EmptyState, Badge, ConfirmDialog, ActionsMenu } from '@/components/ui'
import { ClientModal }        from '@/components/modals/ClientModal'
import { ClientPaymentModal } from '@/components/modals/ClientPaymentModal'
import { useWorkspace }       from '@/context/WorkspaceContext'
import { useClients, useArchiveClient, useDeleteClient } from '@/hooks/useClients'
import { clientsService }     from '@/services/clients.service'
import { useBusinessDashboard } from '@/hooks/useBusinessAnalytics'
import { formatCurrency }     from '@/lib/utils'
import { toast }              from 'sonner'
import type { ApiClient, ClientStatus } from '@/types/api'

function StatusBadge({ status }: { status: ClientStatus }) {
  const map: Record<ClientStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
    ACTIVE:   { label: 'Activo',   variant: 'success' },
    PAUSED:   { label: 'Pausado',  variant: 'warning' },
    INACTIVE: { label: 'Inactivo', variant: 'danger'  },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function ClientsPage() {
  const { activeWorkspace, dateRange } = useWorkspace()
  const wsId = activeWorkspace.id
  const navigate = useNavigate()

  const { data: clients = [], isLoading, isError, refetch } = useClients(wsId)
  const { data: biz } = useBusinessDashboard(wsId, dateRange.from, dateRange.to)

  const [modalOpen,      setModalOpen]      = useState(false)
  const [editing,        setEditing]        = useState<ApiClient | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<ApiClient | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<ApiClient | null>(null)
  const [blockedMsg,     setBlockedMsg]     = useState<string | null>(null)
  const [paymentClient,  setPaymentClient]  = useState<ApiClient | null>(null)

  const archiveClient = useArchiveClient()
  const deleteClient  = useDeleteClient()

  const activeCount    = clients.filter(c => c.status === 'ACTIVE').length
  const totalMonthly   = clients
    .filter(c => c.status === 'ACTIVE')
    .flatMap(c => c.clientServices)
    .filter(cs => cs.status === 'ACTIVE' && cs.billingFrequency === 'MONTHLY')
    .reduce((s, cs) => s + Number(cs.price), 0)

  const kpis = [
    { label: 'Clientes activos',    value: String(activeCount),           icon: Users },
    { label: 'Facturación mensual', value: formatCurrency(totalMonthly),  icon: TrendingUp },
    { label: 'Cobrado este mes',    value: formatCurrency(biz?.collected ?? 0), icon: DollarSign },
    { label: 'Pendiente cobrar',    value: formatCurrency(biz?.pending ?? 0),   icon: Clock },
  ]

  async function handleArchiveOrDelete(client: ApiClient) {
    try {
      const hasAct = await clientsService.hasActivity(client.id, wsId)
      if (hasAct) {
        setConfirmArchive(client)
      } else {
        setConfirmDelete(client)
      }
    } catch {
      toast.error('No pudimos verificar el historial del cliente.')
    }
  }

  async function handleDeleteCheck(client: ApiClient) {
    try {
      const hasAct = await clientsService.hasActivity(client.id, wsId)
      if (hasAct) {
        setBlockedMsg(`"${client.name}" tiene historial de cobros y no puede eliminarse. Puedes archivarlo.`)
      } else {
        setConfirmDelete(client)
      }
    } catch {
      toast.error('No pudimos verificar el historial del cliente.')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description="Gestiona clientes, servicios y pagos de Fernando ADS"
        actions={
          <button onClick={() => { setEditing(null); setModalOpen(true) }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Nuevo cliente
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">{k.label}</p>
              <k.icon className="w-4 h-4 text-brand-400 flex-shrink-0" />
            </div>
            <p className="text-xl font-bold text-content-primary tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {isLoading && <p className="text-content-muted text-sm text-center py-8">Cargando clientes...</p>}
      {isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-content-primary">No pudimos cargar esta información</p>
          <p className="text-xs text-content-muted">Verifica tu conexión e intenta de nuevo.</p>
          <button onClick={() => refetch()} className="mt-2 px-4 py-1.5 rounded-lg bg-base-elevated border border-base-border text-xs font-medium text-content-primary hover:bg-base-hover transition-colors">
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && clients.length === 0 && (
        <EmptyState
          icon={Users}
          title="No tienes clientes registrados todavía"
          description="Crea tu primer cliente para empezar a gestionar pagos y facturación."
        />
      )}

      {clients.length > 0 && (
        <div className="rounded-xl border border-base-border bg-base-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border bg-base-elevated">
                  {['Cliente','Servicios','Mensualidad','Estado',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-content-disabled whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {clients.map(client => {
                  const activeServices = client.clientServices.filter(cs => cs.status === 'ACTIVE')
                  const monthly = activeServices
                    .filter(cs => cs.billingFrequency === 'MONTHLY')
                    .reduce((s, cs) => s + Number(cs.price), 0)

                  return (
                    <tr key={client.id} className="hover:bg-base-elevated/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-content-primary">{client.name}</p>
                        {client.companyName && <p className="text-xs text-content-muted">{client.companyName}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {activeServices.slice(0, 2).map(cs => (
                            <span key={cs.id} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-600/10 text-brand-400 border border-brand-600/20">
                              {cs.service.name}
                            </span>
                          ))}
                          {activeServices.length > 2 && (
                            <span className="text-[10px] text-content-muted">+{activeServices.length - 2}</span>
                          )}
                          {activeServices.length === 0 && <span className="text-xs text-content-disabled">Sin servicios</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-content-primary tabular-nums">
                        {monthly > 0 ? formatCurrency(monthly) : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPaymentClient(client)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 text-xs font-semibold transition-all"
                          >
                            Cobrar
                          </button>
                          <ActionsMenu items={[
                            { label: 'Ver perfil',        icon: ExternalLink,      onClick: () => navigate(`/clients/${client.id}`) },
                            { label: 'Editar',            icon: Pencil,            onClick: () => { setEditing(client); setModalOpen(true) } },
                            { label: 'Registrar cobro',   icon: CircleDollarSign,  onClick: () => setPaymentClient(client) },
                            { label: 'Archivar',          icon: Archive,           onClick: () => handleArchiveOrDelete(client), separator: true },
                            { label: 'Eliminar',          icon: Trash2,            onClick: () => handleDeleteCheck(client), danger: true },
                          ]} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ClientModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} editingClient={editing} />

      {paymentClient && (
        <ClientPaymentModal
          open={!!paymentClient}
          onClose={() => setPaymentClient(null)}
          clientId={paymentClient.id}
          clientName={paymentClient.name}
        />
      )}

      <ConfirmDialog
        open={!!confirmArchive}
        title="Archivar cliente"
        description={`¿Archivar a "${confirmArchive?.name}"? El cliente quedará inactivo pero se conservará todo su historial.`}
        confirmLabel="Archivar"
        variant="warning"
        onConfirm={() => { if (confirmArchive) archiveClient.mutate({ id: confirmArchive.id, workspaceId: wsId }); setConfirmArchive(null) }}
        onCancel={() => setConfirmArchive(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar cliente"
        description={`¿Eliminar a "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => { if (confirmDelete) deleteClient.mutate({ id: confirmDelete.id, workspaceId: wsId }); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!blockedMsg}
        title="No se puede eliminar"
        description={blockedMsg ?? ''}
        confirmLabel="Archivar en su lugar"
        cancelLabel="Cerrar"
        variant="warning"
        onConfirm={() => {
          const client = clients.find(c => blockedMsg?.includes(`"${c.name}"`))
          if (client) setConfirmArchive(client)
          setBlockedMsg(null)
        }}
        onCancel={() => setBlockedMsg(null)}
      />
    </div>
  )
}
