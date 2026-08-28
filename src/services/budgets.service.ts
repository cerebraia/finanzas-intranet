import { supabase } from '@/lib/supabase'

export type BudgetPeriodType = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'

export interface Budget {
  id:             string
  workspaceId:    string
  name:           string
  categoryId:     string | null
  categoryName?:  string | null
  amount:         number
  currency:       string
  periodType:     BudgetPeriodType
  startDate:      string
  endDate:        string
  alertThreshold: number
  isActive:       boolean
  createdAt:      string
  updatedAt:      string
}

export interface CreateBudgetInput {
  workspaceId:     string
  name:            string
  amount:          number
  currency?:       string
  periodType?:     BudgetPeriodType
  categoryId?:     string
  startDate:       string
  endDate:         string
  alertThreshold?: number
}

function mapRow(row: Record<string, unknown>): Budget {
  const cat = row.categories as Record<string, unknown> | null
  return {
    id:             String(row.id),
    workspaceId:    String(row.workspace_id),
    name:           String(row.name),
    categoryId:     row.category_id ? String(row.category_id) : null,
    categoryName:   cat?.name ? String(cat.name) : null,
    amount:         Number(row.amount),
    currency:       String(row.currency ?? 'USD'),
    periodType:     String(row.period_type ?? 'MONTHLY') as BudgetPeriodType,
    startDate:      String(row.start_date),
    endDate:        String(row.end_date),
    alertThreshold: Number(row.alert_threshold ?? 80),
    isActive:       Boolean(row.is_active),
    createdAt:      String(row.created_at),
    updatedAt:      String(row.updated_at),
  }
}

export const budgetsService = {
  async list(workspaceId: string): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories:category_id(name)')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRow)
  },

  async create(input: CreateBudgetInput): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        workspace_id:    input.workspaceId,
        name:            input.name,
        amount:          input.amount,
        currency:        input.currency        ?? 'USD',
        period_type:     input.periodType      ?? 'MONTHLY',
        category_id:     input.categoryId      ?? null,
        start_date:      input.startDate,
        end_date:        input.endDate,
        alert_threshold: input.alertThreshold  ?? 80,
      })
      .select('*, categories:category_id(name)')
      .single()
    if (error) throw new Error(error.message)
    return mapRow(data as unknown as Record<string, unknown>)
  },

  async update(id: string, data: Partial<CreateBudgetInput>): Promise<Budget> {
    const patch: Record<string, unknown> = {}
    if (data.name           !== undefined) patch.name            = data.name
    if (data.amount         !== undefined) patch.amount          = data.amount
    if (data.categoryId     !== undefined) patch.category_id     = data.categoryId
    if (data.startDate      !== undefined) patch.start_date      = data.startDate
    if (data.endDate        !== undefined) patch.end_date        = data.endDate
    if (data.alertThreshold !== undefined) patch.alert_threshold = data.alertThreshold
    const { data: updated, error } = await supabase
      .from('budgets').update(patch).eq('id', id)
      .select('*, categories:category_id(name)').single()
    if (error) throw new Error(error.message)
    return mapRow(updated as unknown as Record<string, unknown>)
  },

  async deactivate(id: string): Promise<void> {
    const { error } = await supabase.from('budgets').update({ is_active: false }).eq('id', id)
    if (error) throw new Error(error.message)
  },
}
