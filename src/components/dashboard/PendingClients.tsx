import { Users } from 'lucide-react'
import type { PendingClient, ClientPaymentStatus } from '@/types'
import { cn } from '@/lib/utils'

const statusConfig: Record<ClientPaymentStatus, { label: string; cls: string }> = {
  overdue: { label: 'Vencido',  cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  pending: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  partial: { label: 'Parcial',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  paid:    { label: 'Pagado',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatDate(str: string) {
  const d = new Date(str + 'T00:00:00')
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

interface PendingClientsProps {
  clients: PendingClient[]
}

export function PendingClients({ clients }: PendingClientsProps) {
  const total = clients.filter(c => c.status !== 'paid').reduce((s, c) => s + c.amount, 0)

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-content-primary">Clientes pendientes</h3>
        </div>
        <span className="text-xs text-content-muted">{clients.length} clientes</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-base-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-border bg-base-elevated">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-content-disabled">Cliente</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-content-disabled">Monto</th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-content-disabled hidden sm:table-cell">Fecha</th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-content-disabled">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-border">
            {clients.map((client) => {
              const { label, cls } = statusConfig[client.status]
              return (
                <tr key={client.id} className="hover:bg-base-elevated/50 transition-colors">
                  <td className="px-3 py-2.5 text-content-primary font-medium">{client.name}</td>
                  <td className="px-3 py-2.5 text-right text-content-primary font-semibold tabular-nums">
                    ${client.amount}
                  </td>
                  <td className="px-3 py-2.5 text-center text-content-muted hidden sm:table-cell">
                    {formatDate(client.dueDate)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded border', cls)}>
                      {label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">Total pendiente</span>
        <span className="text-base font-bold text-amber-400 tabular-nums">${total.toLocaleString()}</span>
      </div>
    </div>
  )
}
