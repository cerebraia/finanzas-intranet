import { supabase } from '@/lib/supabase'
import type { PendingItem, PendingItemSourceType } from '@/types/api'

interface PendingRow {
  id:             string
  source_type:    string
  title:          string
  description:    string
  amount:         number
  amount_paid:    number
  pending_amount: number
  due_date:       string
  status:         string
  workspace_id:   string
  entity_id:      string
  direction:      string
}

export const pendingItemsService = {
  async list(workspaceId: string, limit = 50, types?: PendingItemSourceType[]): Promise<PendingItem[]> {
    const { data, error } = await supabase.rpc('get_pending_items', {
      p_workspace_id: workspaceId,
      p_limit:        limit,
      p_types:        types ?? null,
    })

    if (error) throw new Error(error.message)

    return ((data ?? []) as PendingRow[]).map(r => ({
      id:            r.id,
      sourceType:    r.source_type as PendingItemSourceType,
      title:         r.title,
      description:   r.description,
      amount:        Number(r.amount),
      amountPaid:    Number(r.amount_paid),
      pendingAmount: Number(r.pending_amount),
      dueDate:       r.due_date,
      status:        r.status,
      workspaceId:   r.workspace_id,
    }))
  },
}
