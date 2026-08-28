import { supabase } from '@/lib/supabase'
import type {
  ApiClient, ApiClientService, ApiReceivable, ApiClientPayment,
  ClientProfitability, CreateClientInput, CreateClientServiceInput,
  ClientStatus, ClientServiceStatus, BillingFrequency, ReceivableStatus,
} from '@/types/api'

// ─── Row mappers ─────────────────────────────────────────────────────────────
function mapClient(row: Record<string, unknown>): ApiClient {
  const services = (row.client_services as Record<string, unknown>[] | null) ?? []
  return {
    id:             row.id as string,
    workspaceId:    row.workspace_id as string,
    name:           row.name as string,
    companyName:    row.company_name as string | null,
    email:          row.email as string | null,
    phone:          row.phone as string | null,
    status:         row.status as ClientStatus,
    notes:          row.notes as string | null,
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
    clientServices: services.map(mapClientService),
  }
}

function mapClientService(row: Record<string, unknown>): ApiClientService {
  const svc = row.services as Record<string, unknown> | null
  return {
    id:               row.id as string,
    clientId:         row.client_id as string,
    serviceId:        row.service_id as string,
    price:            row.price as string,
    billingFrequency: row.billing_frequency as BillingFrequency,
    billingDay:       row.billing_day as number,
    startDate:        row.start_date as string,
    endDate:          row.end_date as string | null,
    status:           row.status as ClientServiceStatus,
    notes:            row.notes as string | null,
    service: {
      id:          svc?.id as string ?? '',
      name:        svc?.name as string ?? '',
      description: svc?.description as string | null ?? null,
    },
  }
}

function mapReceivable(row: Record<string, unknown>): ApiReceivable {
  const client  = row.clients as Record<string, unknown> | null
  const cs      = row.client_services as Record<string, unknown> | null
  const payments = (row.payments as Record<string, unknown>[] | null) ?? []

  // OVERDUE calculado dinámicamente
  const status = row.status as ReceivableStatus
  const dueDate = row.due_date as string
  const isOverdue = (status === 'PENDING' || status === 'PARTIAL') && dueDate < new Date().toISOString().slice(0, 10)
  const displayStatus: ReceivableStatus = isOverdue ? 'OVERDUE' : status

  return {
    id:              row.id as string,
    workspaceId:     row.workspace_id as string,
    clientId:        row.client_id as string,
    clientServiceId: row.client_service_id as string | null,
    description:     row.description as string,
    amount:          row.amount as string,
    amountPaid:      row.amount_paid as string,
    dueDate,
    status:          displayStatus,
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

function mapPayment(row: Record<string, unknown>): ApiClientPayment {
  const acct = row.accounts as Record<string, unknown> | null
  const recv = row.receivables as Record<string, unknown> | null
  return {
    id:           row.id as string,
    workspaceId:  row.workspace_id as string,
    clientId:     row.client_id as string,
    receivableId: row.receivable_id as string,
    accountId:    row.account_id as string,
    amount:       row.amount as string,
    paymentDate:  row.payment_date as string,
    reference:    row.reference as string | null,
    notes:        row.notes as string | null,
    transactionId: row.transaction_id as string | null,
    account:  { id: acct?.id as string ?? '', name: acct?.name as string ?? '' },
    receivable: { id: recv?.id as string ?? '', description: recv?.description as string ?? '' },
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────
const CLIENT_JOIN = `*, client_services(*, services:service_id(id, name, description))`
const RCV_JOIN    = `*, clients:client_id(id, name, company_name), client_services:client_service_id(id, services:service_id(id, name)), payments:client_payments(id, amount, payment_date, reference)`

export const clientsService = {
  async list(workspaceId: string): Promise<ApiClient[]> {
    const { data, error } = await supabase
      .from('clients')
      .select(CLIENT_JOIN)
      .eq('workspace_id', workspaceId)
      .order('name')
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapClient)
  },

  async get(id: string, workspaceId: string): Promise<ApiClient> {
    const { data, error } = await supabase
      .from('clients')
      .select(CLIENT_JOIN)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()
    if (error) throw new Error(error.message)
    return mapClient(data as unknown as Record<string, unknown>)
  },

  async create(input: CreateClientInput): Promise<ApiClient> {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        workspace_id: input.workspaceId,
        name:         input.name,
        company_name: input.companyName ?? null,
        email:        input.email      ?? null,
        phone:        input.phone      ?? null,
        notes:        input.notes      ?? null,
      })
      .select(CLIENT_JOIN)
      .single()
    if (error) throw new Error(error.message)
    return mapClient(data as unknown as Record<string, unknown>)
  },

  async update(id: string, _workspaceId: string, data: Partial<CreateClientInput> & { status?: string }): Promise<ApiClient> {
    const patch: Record<string, unknown> = {}
    if (data.name        !== undefined) patch.name         = data.name
    if (data.companyName !== undefined) patch.company_name = data.companyName
    if (data.email       !== undefined) patch.email        = data.email
    if (data.phone       !== undefined) patch.phone        = data.phone
    if (data.notes       !== undefined) patch.notes        = data.notes
    if (data.status      !== undefined) patch.status       = data.status

    const { data: updated, error } = await supabase
      .from('clients')
      .update(patch)
      .eq('id', id)
      .select(CLIENT_JOIN)
      .single()
    if (error) throw new Error(error.message)
    return mapClient(updated as unknown as Record<string, unknown>)
  },

  async listServices(clientId: string, _workspaceId: string): Promise<ApiClientService[]> {
    const { data, error } = await supabase
      .from('client_services')
      .select('*, services:service_id(id, name, description)')
      .eq('client_id', clientId)
      .order('created_at')
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapClientService)
  },

  async addService(clientId: string, workspaceId: string, input: CreateClientServiceInput): Promise<ApiClientService> {
    const { data, error } = await supabase
      .from('client_services')
      .insert({
        workspace_id:      workspaceId,
        client_id:         clientId,
        service_id:        input.serviceId,
        price:             String(input.price),
        billing_frequency: input.billingFrequency ?? 'MONTHLY',
        billing_day:       input.billingDay,
        start_date:        input.startDate,
        end_date:          input.endDate ?? null,
        notes:             input.notes   ?? null,
      })
      .select('*, services:service_id(id, name, description)')
      .single()
    if (error) throw new Error(error.message)
    return mapClientService(data as unknown as Record<string, unknown>)
  },

  async updateService(
    _clientId: string,
    serviceId: string,
    _workspaceId: string,
    data: Partial<CreateClientServiceInput> & { status?: string }
  ): Promise<ApiClientService> {
    const patch: Record<string, unknown> = {}
    if (data.price            !== undefined) patch.price             = String(data.price)
    if (data.billingFrequency !== undefined) patch.billing_frequency = data.billingFrequency
    if (data.billingDay       !== undefined) patch.billing_day       = data.billingDay
    if (data.endDate          !== undefined) patch.end_date          = data.endDate
    if (data.status           !== undefined) patch.status            = data.status
    if (data.notes            !== undefined) patch.notes             = data.notes

    const { data: updated, error } = await supabase
      .from('client_services')
      .update(patch)
      .eq('id', serviceId)
      .select('*, services:service_id(id, name, description)')
      .single()
    if (error) throw new Error(error.message)
    return mapClientService(updated as unknown as Record<string, unknown>)
  },

  async listReceivables(clientId: string, _workspaceId: string): Promise<ApiReceivable[]> {
    const { data, error } = await supabase
      .from('receivables')
      .select(RCV_JOIN)
      .eq('client_id', clientId)
      .order('due_date', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapReceivable)
  },

  async listPayments(clientId: string, _workspaceId: string): Promise<ApiClientPayment[]> {
    const { data, error } = await supabase
      .from('client_payments')
      .select('*, accounts:account_id(id, name), receivables:receivable_id(id, description)')
      .eq('client_id', clientId)
      .eq('cancelled', false)
      .order('payment_date', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapPayment)
  },

  async profitability(clientId: string, workspaceId: string, from?: string, to?: string): Promise<ClientProfitability> {
    const { data, error } = await supabase.rpc('get_client_profitability', {
      p_workspace_id: workspaceId,
      p_client_id:    clientId,
      p_from:         from ?? null,
      p_to:           to   ?? null,
    })
    if (error) throw new Error(error.message)
    const r = data as Record<string, number>
    return { collected: r.collected, directCosts: r.directCosts, margin: r.margin, marginPct: r.marginPct }
  },

  async archive(id: string, workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ status: 'INACTIVE' })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
    if (error) throw new Error(error.message)
  },

  async hasActivity(clientId: string): Promise<boolean> {
    const { count } = await supabase
      .from('receivables')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
    return (count ?? 0) > 0
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
    if (error) throw new Error(error.message)
  },

  async listCatalog(workspaceId: string): Promise<{ id: string; name: string; basePrice: number; billingMode: string }[]> {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, base_price, billing_mode')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('name')
    if (error) throw new Error(error.message)
    return ((data ?? []) as { id: string; name: string; base_price: number; billing_mode: string }[]).map(r => ({
      id:          r.id,
      name:        r.name,
      basePrice:   Number(r.base_price ?? 0),
      billingMode: r.billing_mode ?? 'MONTHLY',
    }))
  },
}
