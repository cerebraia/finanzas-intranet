import { supabase } from '@/lib/supabase'

export interface ApiTransfer {
  id:            string
  workspaceId:   string
  fromAccountId: string
  toAccountId:   string
  amount:        string
  currency:      string
  transferDate:  string
  reference:     string | null
  notes:         string | null
  createdBy:     string | null
  createdAt:     string
  cancelledAt:   string | null
}

export interface RegisterTransferInput {
  workspaceId:    string
  fromAccountId:  string
  toAccountId:    string
  amount:         number
  currency:       string
  transferDate:   string
  reference?:     string
  notes?:         string
}

export const transfersService = {
  async list(workspaceId: string): Promise<ApiTransfer[]> {
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('transfer_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      id:            String(r.id),
      workspaceId:   String(r.workspace_id),
      fromAccountId: String(r.from_account_id),
      toAccountId:   String(r.to_account_id),
      amount:        String(r.amount),
      currency:      String(r.currency),
      transferDate:  String(r.transfer_date),
      reference:     r.reference != null ? String(r.reference) : null,
      notes:         r.notes     != null ? String(r.notes)     : null,
      createdBy:     r.created_by != null ? String(r.created_by) : null,
      createdAt:     String(r.created_at),
      cancelledAt:   r.cancelled_at != null ? String(r.cancelled_at) : null,
    }))
  },

  async register(input: RegisterTransferInput): Promise<{ transferId: string }> {
    const { data, error } = await supabase.rpc('register_transfer', {
      p_workspace_id:   input.workspaceId,
      p_from_account_id: input.fromAccountId,
      p_to_account_id:  input.toAccountId,
      p_amount:         input.amount,
      p_currency:       input.currency,
      p_transfer_date:  input.transferDate,
      p_reference:      input.reference ?? null,
      p_notes:          input.notes     ?? null,
    })
    if (error) throw new Error(error.message)
    return { transferId: (data as Record<string, string>).transfer_id }
  },

  async cancel(workspaceId: string, transferId: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_transfer', {
      p_workspace_id: workspaceId,
      p_transfer_id:  transferId,
    })
    if (error) throw new Error(error.message)
  },
}
