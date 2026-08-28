import { supabase } from '@/lib/supabase'
import type {
  ApiTransaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionType,
  TransactionStatus,
} from '@/types/api'

interface TxRow {
  id:               string
  workspace_id:     string
  account_id:       string
  category_id:      string
  type:             string
  amount:           string
  description:      string
  transaction_date: string
  status:           string
  notes:            string | null
  reference:        string | null
  created_at:       string
  updated_at:       string
  accounts:         { id: string; name: string; type: string } | null
  categories:       { id: string; name: string; type: string; icon: string | null } | null
}

function rowToApi(row: TxRow): ApiTransaction {
  return {
    id:              row.id,
    workspaceId:     row.workspace_id,
    accountId:       row.account_id,
    categoryId:      row.category_id,
    type:            row.type as TransactionType,
    amount:          row.amount,
    description:     row.description,
    transactionDate: row.transaction_date,
    status:          row.status as TransactionStatus,
    notes:           row.notes,
    reference:       row.reference,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
    account: row.accounts
      ? { id: row.accounts.id, name: row.accounts.name, type: row.accounts.type as ApiTransaction['account']['type'] }
      : { id: row.account_id, name: '', type: 'CASH' },
    category: row.categories
      ? { id: row.categories.id, name: row.categories.name, type: row.categories.type as ApiTransaction['category']['type'], color: null, icon: row.categories.icon }
      : { id: row.category_id, name: '', type: 'EXPENSE', color: null, icon: null },
  }
}

interface ListParams {
  workspaceId: string
  from?:        string
  to?:          string
  type?:        TransactionType
  categoryId?:  string
  accountId?:   string
  status?:      TransactionStatus
  q?:           string
}

const JOIN = `*, accounts:account_id ( id, name, type ), categories:category_id ( id, name, type, icon )`

export const transactionsService = {
  async list(params: ListParams): Promise<ApiTransaction[]> {
    let query = supabase
      .from('transactions')
      .select(JOIN)
      .eq('workspace_id', params.workspaceId)
      .order('transaction_date', { ascending: false })
      .order('created_at',       { ascending: false })

    if (params.from)       query = query.gte('transaction_date', params.from)
    if (params.to)         query = query.lte('transaction_date', params.to)
    if (params.type)       query = query.eq('type', params.type)
    if (params.categoryId) query = query.eq('category_id', params.categoryId)
    if (params.accountId)  query = query.eq('account_id', params.accountId)
    if (params.status)     query = query.eq('status', params.status)
    if (params.q)          query = query.ilike('description', `%${params.q}%`)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return ((data ?? []) as TxRow[]).map(rowToApi)
  },

  async get(id: string, _workspaceId: string): Promise<ApiTransaction> {
    const { data, error } = await supabase
      .from('transactions')
      .select(JOIN)
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return rowToApi(data as TxRow)
  },

  async create(input: CreateTransactionInput): Promise<ApiTransaction> {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        workspace_id:     input.workspaceId,
        account_id:       input.accountId,
        category_id:      input.categoryId,
        type:             input.type,
        amount:           String(input.amount),
        currency:         'USD',
        description:      input.description,
        transaction_date: input.transactionDate,
        status:           input.status ?? 'COMPLETED',
        notes:            input.notes    ?? null,
        reference:        input.reference ?? null,
        source_type:      'MANUAL',
        created_by:       user?.id ?? null,
      })
      .select(JOIN)
      .single()

    if (error) throw new Error(error.message)
    return rowToApi(data as TxRow)
  },

  async update(id: string, _workspaceId: string, input: UpdateTransactionInput): Promise<ApiTransaction> {
    const patch: Record<string, unknown> = {}
    if (input.accountId       !== undefined) patch.account_id       = input.accountId
    if (input.categoryId      !== undefined) patch.category_id      = input.categoryId
    if (input.amount          !== undefined) patch.amount           = String(input.amount)
    if (input.description     !== undefined) patch.description      = input.description
    if (input.transactionDate !== undefined) patch.transaction_date = input.transactionDate
    if (input.status          !== undefined) patch.status           = input.status
    if (input.notes           !== undefined) patch.notes            = input.notes
    if (input.reference       !== undefined) patch.reference        = input.reference

    const { data, error } = await supabase
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .select(JOIN)
      .single()

    if (error) throw new Error(error.message)
    return rowToApi(data as TxRow)
  },

  async cancel(id: string, _workspaceId: string): Promise<ApiTransaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update({ status: 'CANCELLED' })
      .eq('id', id)
      .select(JOIN)
      .single()

    if (error) throw new Error(error.message)
    return rowToApi(data as TxRow)
  },

}
