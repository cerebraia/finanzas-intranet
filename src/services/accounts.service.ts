import { supabase } from '@/lib/supabase'
import type { AccountRow } from '@/types/database.types'
import type { ApiAccount, CreateAccountInput } from '@/types/api'

function rowToApi(row: AccountRow): ApiAccount {
  return {
    id:             row.id,
    workspaceId:    row.workspace_id,
    name:           row.name,
    type:           row.type,
    currency:       row.currency,
    initialBalance: String(row.initial_balance),
    currentBalance: 0,
    isActive:       row.is_active,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  }
}

export const accountsService = {
  async list(workspaceId: string): Promise<ApiAccount[]> {
    // Try canonical RPC first (available after migration 023)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_account_balances', {
      p_workspace_id: workspaceId,
    })

    if (!rpcError && rpcData) {
      return (rpcData as Array<{
        account_id: string; account_name: string; account_type: string;
        currency: string; initial_balance: number; current_balance: number
      }>).map(r => ({
        id:             r.account_id,
        workspaceId,
        name:           r.account_name,
        type:           r.account_type as ApiAccount['type'],
        currency:       r.currency as ApiAccount['currency'],
        initialBalance: String(r.initial_balance),
        currentBalance: r.current_balance,
        isActive:       true,
        createdAt:      '',
        updatedAt:      '',
      }))
    }

    // Fallback: JS-side balance calculation (no transfer support, but always available)
    const [{ data: accounts, error }, { data: txs }] = await Promise.all([
      supabase
        .from('accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('created_at'),
      supabase
        .from('transactions')
        .select('account_id, type, amount')
        .eq('workspace_id', workspaceId)
        .eq('status', 'COMPLETED')
        .in('type', ['INCOME', 'EXPENSE']),
    ])

    if (error) throw new Error(error.message)

    const txBalance: Record<string, number> = {}
    for (const tx of (txs ?? []) as { account_id: string; type: string; amount: string }[]) {
      const amt = parseFloat(tx.amount)
      txBalance[tx.account_id] = (txBalance[tx.account_id] ?? 0) + (tx.type === 'INCOME' ? amt : -amt)
    }

    return ((accounts ?? []) as AccountRow[]).map(row => ({
      ...rowToApi(row),
      currentBalance: parseFloat(String(row.initial_balance)) + (txBalance[row.id] ?? 0),
    }))
  },

  async get(id: string): Promise<ApiAccount> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return rowToApi(data as AccountRow)
  },

  async create(input: CreateAccountInput): Promise<ApiAccount> {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        workspace_id:    input.workspaceId,
        name:            input.name,
        type:            input.type,
        currency:        input.currency ?? 'USD',
        initial_balance: input.initialBalance ?? 0,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return rowToApi(data as AccountRow)
  },

  async update(id: string, input: Partial<CreateAccountInput>): Promise<ApiAccount> {
    const patch: Partial<AccountRow> = {}
    if (input.name           !== undefined) patch.name            = input.name
    if (input.type           !== undefined) patch.type            = input.type
    if (input.currency       !== undefined) patch.currency        = input.currency
    if (input.initialBalance !== undefined) patch.initial_balance = input.initialBalance

    const { data, error } = await supabase
      .from('accounts')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return rowToApi(data as AccountRow)
  },

  async deactivate(id: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  remove: async (id: string) => accountsService.deactivate(id),
}
