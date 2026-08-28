import { supabase } from '@/lib/supabase'
import type { BusinessDashboardData, ApiReceivable } from '@/types/api'

function mapReceivable(row: Record<string, unknown>) {
  const client = row.clients as Record<string, unknown> | null
  const cs     = row.client_services as Record<string, unknown> | null
  const pmts   = (row.payments as Record<string, unknown>[] | null) ?? []
  const status  = row.status as string
  const dueDate = row.due_date as string
  const isOverdue = (status === 'PENDING' || status === 'PARTIAL') && dueDate < new Date().toISOString().slice(0, 10)

  return {
    id:              row.id as string,
    workspaceId:     row.workspace_id as string,
    clientId:        row.client_id as string,
    clientServiceId: row.client_service_id as string | null,
    description:     row.description as string,
    amount:          row.amount as string,
    amountPaid:      row.amount_paid as string,
    dueDate,
    status:          isOverdue ? 'OVERDUE' : status,
    periodMonth:     row.period_month as number | null,
    periodYear:      row.period_year as number | null,
    notes:           row.notes as string | null,
    createdAt:       row.created_at as string,
    client: {
      id:          client?.id as string ?? row.client_id as string,
      name:        client?.name as string ?? '',
      companyName: client?.company_name as string | null ?? null,
    },
    clientService: cs ? {
      id: cs.id as string,
      service: { id: (cs.services as Record<string, unknown>)?.id as string ?? '', name: (cs.services as Record<string, unknown>)?.name as string ?? '' },
    } : null,
    payments: pmts.map(p => ({ id: p.id as string, amount: p.amount as string, paymentDate: p.payment_date as string, reference: p.reference as string | null })),
  } as ApiReceivable
}

export const businessAnalyticsService = {
  async dashboard(workspaceId: string, from: string, to: string): Promise<BusinessDashboardData> {
    const { data, error } = await supabase.rpc('get_business_dashboard', {
      p_workspace_id: workspaceId,
      p_from:         from,
      p_to:           to,
    })
    if (error) throw new Error(error.message)
    const r = data as Record<string, number>
    return {
      billed:          r.billed          ?? 0,
      collected:       r.collected       ?? 0,
      pending:         r.pending         ?? 0,
      expenses:        r.expenses        ?? 0,
      operatingProfit: r.operatingProfit ?? 0,
      billedCount:     r.billedCount     ?? 0,
      collectedCount:  r.collectedCount  ?? 0,
    }
  },

  async pendingReceivables(workspaceId: string, limit = 5): Promise<ApiReceivable[]> {
    const JOIN = `*, clients:client_id(id, name, company_name), client_services:client_service_id(id, services:service_id(id, name)), payments:client_payments(id, amount, payment_date, reference)`
    const { data, error } = await supabase
      .from('receivables')
      .select(JOIN)
      .eq('workspace_id', workspaceId)
      .in('status', ['PENDING','PARTIAL'])
      .order('due_date')
      .limit(limit)
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapReceivable)
  },
}
