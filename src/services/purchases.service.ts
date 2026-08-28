import { supabase } from '@/lib/supabase'
import type { PurchaseItem, PurchasePriority, PurchaseCategory } from '@/types/purchases'

interface PurchaseRow {
  id:               string
  workspace_id:     string | null
  title:            string
  description:      string | null
  category:         string
  estimated_amount: number | null
  currency:         string
  priority:         string
  status:           string
  due_date:         string | null
  reminder_date:    string | null
  is_recurring:     boolean
  recurrence:       string | null
  notes:            string | null
  completed_at:     string | null
  transaction_id:   string | null
  planned_month:    string | null
  created_at:       string
  updated_at:       string
}

function rowToItem(row: PurchaseRow): PurchaseItem {
  return {
    id:              row.id,
    workspaceId:     row.workspace_id ?? undefined,
    title:           row.title,
    description:     row.description  ?? undefined,
    category:        row.category as PurchaseCategory,
    estimatedAmount: row.estimated_amount ?? undefined,
    currency:        row.currency as PurchaseItem['currency'],
    priority:        row.priority as PurchasePriority,
    status:          row.status as PurchaseItem['status'],
    dueDate:         row.due_date        ?? undefined,
    reminderDate:    row.reminder_date   ?? undefined,
    isRecurring:     row.is_recurring,
    notes:           row.notes           ?? undefined,
    completedAt:     row.completed_at    ?? undefined,
    transactionId:   row.transaction_id  ?? undefined,
    plannedMonth:    row.planned_month   ?? undefined,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  }
}

export const purchasesService = {
  async list(workspaceId?: string): Promise<PurchaseItem[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
      .from('purchase_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (workspaceId) {
      query = query.or(`workspace_id.eq.${workspaceId},and(workspace_id.is.null,created_by.eq.${user.id})`)
    } else {
      query = query.is('workspace_id', null)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return ((data ?? []) as PurchaseRow[]).map(rowToItem)
  },

  async create(input: {
    title:            string
    category:         PurchaseCategory
    priority:         PurchasePriority
    description?:     string
    estimatedAmount?: number
    dueDate?:         string
    reminderDate?:    string
    notes?:           string
    workspaceId?:     string
  }): Promise<PurchaseItem> {
    const { data, error } = await supabase
      .from('purchase_items')
      .insert({
        title:            input.title,
        category:         input.category,
        priority:         input.priority,
        description:      input.description      ?? null,
        estimated_amount: input.estimatedAmount   ?? null,
        due_date:         input.dueDate          ?? null,
        reminder_date:    input.reminderDate      ?? null,
        notes:            input.notes            ?? null,
        workspace_id:     input.workspaceId       ?? null,
        status:           'TODO',
        is_recurring:     false,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToItem(data as PurchaseRow)
  },

  async update(id: string, data: Partial<PurchaseItem>): Promise<PurchaseItem> {
    const patch: Record<string, unknown> = {}
    if (data.title           !== undefined) patch.title            = data.title
    if (data.description     !== undefined) patch.description      = data.description
    if (data.category        !== undefined) patch.category         = data.category
    if (data.estimatedAmount !== undefined) patch.estimated_amount = data.estimatedAmount
    if (data.priority        !== undefined) patch.priority         = data.priority
    if (data.status          !== undefined) patch.status           = data.status
    if (data.dueDate         !== undefined) patch.due_date         = data.dueDate
    if (data.reminderDate    !== undefined) patch.reminder_date    = data.reminderDate
    if (data.notes           !== undefined) patch.notes            = data.notes
    if (data.plannedMonth    !== undefined) patch.planned_month    = data.plannedMonth ?? null

    const { data: updated, error } = await supabase
      .from('purchase_items')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToItem(updated as PurchaseRow)
  },

  async markPurchased(id: string, transactionId?: string): Promise<PurchaseItem> {
    const { data, error } = await supabase
      .from('purchase_items')
      .update({
        status:         'PURCHASED',
        completed_at:   new Date().toISOString(),
        transaction_id: transactionId ?? null,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToItem(data as PurchaseRow)
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('purchase_items').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async completeAsExpense(input: {
    workspaceId: string
    purchaseId:  string
    accountId:   string
    categoryId:  string
    amount:      number
    description: string
    date:        string
  }): Promise<{ transactionId: string }> {
    const { data, error } = await supabase.rpc('complete_purchase_as_expense', {
      p_workspace_id: input.workspaceId,
      p_purchase_id:  input.purchaseId,
      p_account_id:   input.accountId,
      p_category_id:  input.categoryId,
      p_amount:       input.amount,
      p_description:  input.description,
      p_date:         input.date,
    })
    if (error) throw new Error(error.message)
    return { transactionId: (data as Record<string, string>).transaction_id }
  },
}
