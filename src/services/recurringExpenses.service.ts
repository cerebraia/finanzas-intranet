import { supabase } from '@/lib/supabase'
import type { ApiRecurringExpense, CreateRecurringExpenseInput, RecurringFrequency } from '@/types/api'

function mapExpense(row: Record<string, unknown>): ApiRecurringExpense {
  const cat  = row.categories as Record<string, unknown> | null
  const acct = row.accounts   as Record<string, unknown> | null
  return {
    id:          row.id as string,
    workspaceId: row.workspace_id as string,
    name:        row.name as string,
    amount:      row.amount as string,
    categoryId:  row.category_id as string,
    frequency:   row.frequency as RecurringFrequency,
    paymentDay:  row.payment_day as number,
    accountId:   row.default_account_id as string | null,
    startDate:   row.start_date as string,
    endDate:     row.end_date as string | null,
    isActive:    row.is_active as boolean,
    notes:       row.notes as string | null,
    category: {
      id:    cat?.id as string    ?? row.category_id as string,
      name:  cat?.name as string  ?? '',
      color: cat?.color as string | null ?? null,
    },
    account: acct ? { id: acct.id as string, name: acct.name as string } : null,
  }
}

const JOIN = `*, categories:category_id(id, name), accounts:default_account_id(id, name)`

export const recurringExpensesService = {
  async list(workspaceId: string): Promise<ApiRecurringExpense[]> {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select(JOIN)
      .eq('workspace_id', workspaceId)
      .order('name')
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapExpense)
  },

  async create(input: CreateRecurringExpenseInput): Promise<ApiRecurringExpense> {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert({
        workspace_id:       input.workspaceId,
        name:               input.name,
        amount:             String(input.amount),
        category_id:        input.categoryId,
        frequency:          input.frequency    ?? 'MONTHLY',
        payment_day:        input.paymentDay,
        default_account_id: input.accountId    ?? null,
        start_date:         input.startDate,
        notes:              input.notes        ?? null,
      })
      .select(JOIN)
      .single()
    if (error) throw new Error(error.message)
    return mapExpense(data as unknown as Record<string, unknown>)
  },

  async update(id: string, _workspaceId: string, data: Partial<CreateRecurringExpenseInput> & { isActive?: boolean }): Promise<ApiRecurringExpense> {
    const patch: Record<string, unknown> = {}
    if (data.name       !== undefined) patch.name               = data.name
    if (data.amount     !== undefined) patch.amount             = String(data.amount)
    if (data.categoryId !== undefined) patch.category_id        = data.categoryId
    if (data.frequency  !== undefined) patch.frequency          = data.frequency
    if (data.paymentDay !== undefined) patch.payment_day        = data.paymentDay
    if (data.accountId  !== undefined) patch.default_account_id = data.accountId
    if (data.notes      !== undefined) patch.notes              = data.notes
    if (data.isActive   !== undefined) patch.is_active          = data.isActive

    const { data: updated, error } = await supabase
      .from('recurring_expenses')
      .update(patch)
      .eq('id', id)
      .select(JOIN)
      .single()
    if (error) throw new Error(error.message)
    return mapExpense(updated as unknown as Record<string, unknown>)
  },

  async pay(
    id: string,
    workspaceId: string,
    data: { month: number; year: number; accountId: string; paymentDate: string; reference?: string }
  ): Promise<unknown> {
    const { data: result, error } = await supabase.rpc('pay_recurring_expense', {
      p_workspace_id:         workspaceId,
      p_recurring_expense_id: id,
      p_month:                data.month,
      p_year:                 data.year,
      p_account_id:           data.accountId,
      p_payment_date:         data.paymentDate,
      p_reference:            data.reference ?? null,
    })
    if (error) throw new Error(error.message)
    return result
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('recurring_expenses')
      .update({ is_active: isActive })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async hasHistory(id: string): Promise<boolean> {
    const { count } = await supabase
      .from('recurring_expense_obligations')
      .select('id', { count: 'exact', head: true })
      .eq('recurring_expense_id', id)
    return (count ?? 0) > 0
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async generate(workspaceId: string, month: number, year: number): Promise<{ created: string[]; skipped: string[] }> {
    const { data, error } = await supabase.rpc('generate_recurring_obligations', {
      p_workspace_id: workspaceId,
      p_month:        month,
      p_year:         year,
    })
    if (error) throw new Error(error.message)
    const r = data as Record<string, number>
    return { created: Array(r.created ?? 0).fill(''), skipped: Array(r.skipped ?? 0).fill('') }
  },
}
