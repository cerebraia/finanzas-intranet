import { supabase } from '@/lib/supabase'

export type BillingMode = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'

export const BILLING_MODE_LABEL: Record<BillingMode, string> = {
  ONE_TIME:   'Pago único',
  MONTHLY:    'Mensual',
  QUARTERLY:  'Trimestral',
  YEARLY:     'Anual',
  CUSTOM:     'Personalizado',
}

export interface BusinessService {
  id:          string
  workspaceId: string
  name:        string
  description: string | null
  basePrice:   number
  currency:    string
  billingMode: BillingMode
  category:    string | null
  isActive:    boolean
  createdAt:   string
  updatedAt:   string
}

function mapService(r: Record<string, unknown>): BusinessService {
  return {
    id:          String(r.id),
    workspaceId: String(r.workspace_id),
    name:        String(r.name),
    description: r.description  ? String(r.description)  : null,
    basePrice:   Number(r.base_price  ?? 0),
    currency:    String(r.currency    ?? 'USD'),
    billingMode: String(r.billing_mode ?? 'MONTHLY') as BillingMode,
    category:    r.category ? String(r.category) : null,
    isActive:    Boolean(r.is_active ?? true),
    createdAt:   String(r.created_at),
    updatedAt:   String(r.updated_at),
  }
}

export const businessServicesService = {
  async list(workspaceId: string, includeInactive = false): Promise<BusinessService[]> {
    let q = supabase
      .from('services')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name')

    if (!includeInactive) q = q.eq('is_active', true)

    const { data, error } = await q
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(mapService)
  },

  async create(input: {
    workspaceId: string
    name:        string
    description?: string
    basePrice:   number
    currency?:   string
    billingMode: BillingMode
    category?:   string
  }): Promise<BusinessService> {
    const { data, error } = await supabase
      .from('services')
      .insert({
        workspace_id: input.workspaceId,
        name:         input.name,
        description:  input.description  ?? null,
        base_price:   input.basePrice,
        currency:     input.currency     ?? 'USD',
        billing_mode: input.billingMode,
        category:     input.category     ?? null,
        is_active:    true,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapService(data as Record<string, unknown>)
  },

  async update(id: string, input: Partial<{
    name:        string
    description: string | null
    basePrice:   number
    currency:    string
    billingMode: BillingMode
    category:    string | null
    isActive:    boolean
  }>): Promise<BusinessService> {
    const patch: Record<string, unknown> = {}
    if (input.name        !== undefined) patch.name         = input.name
    if (input.description !== undefined) patch.description  = input.description
    if (input.basePrice   !== undefined) patch.base_price   = input.basePrice
    if (input.currency    !== undefined) patch.currency     = input.currency
    if (input.billingMode !== undefined) patch.billing_mode = input.billingMode
    if (input.category    !== undefined) patch.category     = input.category
    if (input.isActive    !== undefined) patch.is_active    = input.isActive

    const { data, error } = await supabase
      .from('services')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapService(data as Record<string, unknown>)
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('services')
      .update({ is_active: isActive })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },
}
