import { supabase } from '@/lib/supabase'
import type { ApiReceivable, RegisterPaymentInput, ReceivableStatus } from '@/types/api'

function mapReceivable(row: Record<string, unknown>): ApiReceivable {
  const client  = row.clients as Record<string, unknown> | null
  const cs      = row.client_services as Record<string, unknown> | null
  const payments = (row.payments as Record<string, unknown>[] | null) ?? []

  const status  = row.status as ReceivableStatus
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
    payments: payments.map(p => ({
      id:          p.id as string,
      amount:      p.amount as string,
      paymentDate: p.payment_date as string,
      reference:   p.reference as string | null,
    })),
  }
}

const JOIN = `*, clients:client_id(id, name, company_name), client_services:client_service_id(id, services:service_id(id, name)), payments:client_payments(id, amount, payment_date, reference)`

export const receivablesService = {
  async list(workspaceId: string, params?: { from?: string; to?: string; clientId?: string; status?: string }): Promise<ApiReceivable[]> {
    let query = supabase
      .from('receivables')
      .select(JOIN)
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: false })

    if (params?.clientId) query = query.eq('client_id', params.clientId)
    if (params?.from)     query = query.gte('due_date', params.from)
    if (params?.to)       query = query.lte('due_date', params.to)
    // OVERDUE es calculado, no filtramos directamente por él
    if (params?.status && params.status !== 'OVERDUE') {
      query = query.eq('status', params.status)
    } else if (params?.status === 'OVERDUE') {
      query = query.in('status', ['PENDING','PARTIAL'])
        .lt('due_date', new Date().toISOString().slice(0, 10))
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapReceivable)
  },

  async registerPayment(
    receivableId: string,
    data: RegisterPaymentInput
  ): Promise<{ payment: unknown; receivable: unknown; transaction: unknown }> {
    const { data: result, error } = await supabase.rpc('register_client_payment', {
      p_workspace_id:    data.workspaceId,
      p_client_id:       data.clientId,
      p_receivable_id:   receivableId,
      p_account_id:      data.accountId,
      p_amount:          data.amount,
      p_currency:        'USD',
      p_payment_date:    data.paymentDate,
      p_reference:       data.reference       ?? null,
      p_notes:           data.notes           ?? null,
      p_idempotency_key: data.idempotencyKey  ?? null,
    })
    if (error) throw new Error(error.message)
    const r = result as Record<string, unknown>
    return { payment: { id: r.payment_id }, receivable: { id: receivableId, status: r.receivable_status }, transaction: { id: r.transaction_id } }
  },

  async generateMonthly(
    workspaceId: string,
    month: number,
    year: number
  ): Promise<{ created: string[]; skipped: string[] }> {
    const { data, error } = await supabase.rpc('generate_monthly_receivables', {
      p_workspace_id: workspaceId,
      p_month:        month,
      p_year:         year,
    })
    if (error) throw new Error(error.message)
    const r = data as Record<string, number>
    // Devolver arrays de longitud apropiada para los toasts de los hooks
    return {
      created: Array(r.created ?? 0).fill(''),
      skipped: Array(r.skipped ?? 0).fill(''),
    }
  },
}
