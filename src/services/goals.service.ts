import { supabase } from '@/lib/supabase'

export type GoalStatus   = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface FinancialGoal {
  id:              string
  workspaceId:     string
  name:            string
  description:     string | null
  targetAmount:    number
  currency:        string
  targetDate:      string | null
  status:          GoalStatus
  priority:        GoalPriority
  linkedAccountId: string | null
  createdAt:       string
  updatedAt:       string
  completedAt:     string | null
}

export interface GoalContribution {
  id:               string
  workspaceId:      string
  goalId:           string
  amount:           number
  contributionDate: string
  accountId:        string | null
  notes:            string | null
  createdAt:        string
}

function mapGoal(row: Record<string, unknown>): FinancialGoal {
  return {
    id:              String(row.id),
    workspaceId:     String(row.workspace_id),
    name:            String(row.name),
    description:     row.description ? String(row.description) : null,
    targetAmount:    Number(row.target_amount),
    currency:        String(row.currency ?? 'USD'),
    targetDate:      row.target_date  ? String(row.target_date)  : null,
    status:          String(row.status   ?? 'ACTIVE') as GoalStatus,
    priority:        String(row.priority ?? 'MEDIUM') as GoalPriority,
    linkedAccountId: row.linked_account_id ? String(row.linked_account_id) : null,
    createdAt:       String(row.created_at),
    updatedAt:       String(row.updated_at),
    completedAt:     row.completed_at ? String(row.completed_at) : null,
  }
}

export const goalsService = {
  async list(workspaceId: string): Promise<FinancialGoal[]> {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('status', ['ACTIVE','PAUSED'])
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(mapGoal)
  },

  async create(input: {
    workspaceId:     string
    name:            string
    description?:    string
    targetAmount:    number
    currency?:       string
    targetDate?:     string
    priority?:       GoalPriority
    linkedAccountId?: string
  }): Promise<FinancialGoal> {
    const { data, error } = await supabase
      .from('financial_goals')
      .insert({
        workspace_id:      input.workspaceId,
        name:              input.name,
        description:       input.description      ?? null,
        target_amount:     input.targetAmount,
        currency:          input.currency          ?? 'USD',
        target_date:       input.targetDate         ?? null,
        priority:          input.priority           ?? 'MEDIUM',
        linked_account_id: input.linkedAccountId    ?? null,
      })
      .select('*').single()
    if (error) throw new Error(error.message)
    return mapGoal(data as Record<string, unknown>)
  },

  async update(id: string, data: Partial<{ name: string; description: string; targetDate: string; status: GoalStatus; priority: GoalPriority }>): Promise<FinancialGoal> {
    const patch: Record<string, unknown> = {}
    if (data.name        !== undefined) patch.name        = data.name
    if (data.description !== undefined) patch.description = data.description
    if (data.targetDate  !== undefined) patch.target_date = data.targetDate
    if (data.status      !== undefined) {
      patch.status = data.status
      if (data.status === 'COMPLETED') patch.completed_at = new Date().toISOString()
    }
    if (data.priority    !== undefined) patch.priority    = data.priority
    const { data: updated, error } = await supabase
      .from('financial_goals').update(patch).eq('id', id).select('*').single()
    if (error) throw new Error(error.message)
    return mapGoal(updated as Record<string, unknown>)
  },

  async addContribution(input: {
    workspaceId:      string
    goalId:           string
    amount:           number
    contributionDate?: string
    accountId?:       string
    notes?:           string
  }): Promise<GoalContribution> {
    const { data, error } = await supabase
      .from('goal_contributions')
      .insert({
        workspace_id:      input.workspaceId,
        goal_id:           input.goalId,
        amount:            input.amount,
        contribution_date: input.contributionDate ?? new Date().toISOString().slice(0, 10),
        account_id:        input.accountId ?? null,
        notes:             input.notes     ?? null,
      })
      .select('*').single()
    if (error) throw new Error(error.message)
    const r = data as Record<string, unknown>
    return {
      id:               String(r.id),
      workspaceId:      String(r.workspace_id),
      goalId:           String(r.goal_id),
      amount:           Number(r.amount),
      contributionDate: String(r.contribution_date),
      accountId:        r.account_id ? String(r.account_id) : null,
      notes:            r.notes      ? String(r.notes)      : null,
      createdAt:        String(r.created_at),
    }
  },

  async listContributions(goalId: string): Promise<GoalContribution[]> {
    const { data, error } = await supabase
      .from('goal_contributions')
      .select('*')
      .eq('goal_id', goalId)
      .order('contribution_date', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      id:               String(r.id),
      workspaceId:      String(r.workspace_id),
      goalId:           String(r.goal_id),
      amount:           Number(r.amount),
      contributionDate: String(r.contribution_date),
      accountId:        r.account_id ? String(r.account_id) : null,
      notes:            r.notes      ? String(r.notes)      : null,
      createdAt:        String(r.created_at),
    }))
  },
}
