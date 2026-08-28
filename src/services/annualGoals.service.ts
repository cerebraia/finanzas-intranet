import { supabase } from '@/lib/supabase'
import type {
  AnnualGoal, AnnualGoalMilestone, AnnualGoalSummary,
  AnnualGoalCategory, AnnualGoalStatus, AnnualGoalPriority, AnnualGoalProgressMode,
} from '@/types/annualGoals'

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapGoal(r: Record<string, unknown>): AnnualGoal {
  return {
    id:                  String(r.id),
    workspaceId:         String(r.workspace_id),
    title:               String(r.title),
    description:         r.description         ? String(r.description)          : null,
    year:                Number(r.year),
    category:            String(r.category)     as AnnualGoalCategory,
    priority:            String(r.priority)     as AnnualGoalPriority,
    status:              String(r.status)       as AnnualGoalStatus,
    progress:            Number(r.progress),
    progressMode:        String(r.progress_mode) as AnnualGoalProgressMode,
    isFocus:             Boolean(r.is_focus),
    targetDate:          r.target_date          ? String(r.target_date)          : null,
    startedAt:           r.started_at           ? String(r.started_at)           : null,
    completedAt:         r.completed_at         ? String(r.completed_at)         : null,
    progressUpdatedAt:   r.progress_updated_at  ? String(r.progress_updated_at)  : null,
    financialGoalId:     r.financial_goal_id    ? String(r.financial_goal_id)    : null,
    purchaseItemId:      r.purchase_item_id     ? String(r.purchase_item_id)     : null,
    carryOverFromGoalId: r.carry_over_from_goal_id ? String(r.carry_over_from_goal_id) : null,
    notes:               r.notes                ? String(r.notes)                : null,
    createdBy:           r.created_by           ? String(r.created_by)           : null,
    createdAt:           String(r.created_at),
    updatedAt:           String(r.updated_at),
  }
}

function mapMilestone(r: Record<string, unknown>): AnnualGoalMilestone {
  return {
    id:          String(r.id),
    workspaceId: String(r.workspace_id),
    goalId:      String(r.goal_id),
    title:       String(r.title),
    description: r.description  ? String(r.description)  : null,
    status:      String(r.status) as AnnualGoalMilestone['status'],
    targetDate:  r.target_date   ? String(r.target_date)  : null,
    completedAt: r.completed_at  ? String(r.completed_at) : null,
    sortOrder:   Number(r.sort_order ?? 0),
    createdAt:   String(r.created_at),
    updatedAt:   String(r.updated_at),
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const annualGoalsService = {

  async list(workspaceId: string, year: number): Promise<AnnualGoal[]> {
    const { data, error } = await supabase
      .from('annual_goals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('year', year)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(mapGoal)
  },

  async listFocus(workspaceId: string, year: number): Promise<AnnualGoal[]> {
    const { data, error } = await supabase
      .from('annual_goals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('year', year)
      .eq('is_focus', true)
      .not('status', 'in', '("COMPLETED","CANCELLED")')
      .order('priority', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(mapGoal)
  },

  async get(id: string): Promise<AnnualGoal> {
    const { data, error } = await supabase
      .from('annual_goals')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return mapGoal(data as Record<string, unknown>)
  },

  async create(input: {
    workspaceId:    string
    title:          string
    description?:   string
    year:           number
    category:       AnnualGoalCategory
    priority:       AnnualGoalPriority
    progressMode:   AnnualGoalProgressMode
    isFocus?:       boolean
    targetDate?:    string
    notes?:         string
    financialGoalId?: string
    purchaseItemId?:  string
  }): Promise<AnnualGoal> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('annual_goals')
      .insert({
        workspace_id:     input.workspaceId,
        title:            input.title,
        description:      input.description    ?? null,
        year:             input.year,
        category:         input.category,
        priority:         input.priority,
        progress_mode:    input.progressMode,
        is_focus:         input.isFocus        ?? false,
        target_date:      input.targetDate     ?? null,
        notes:            input.notes          ?? null,
        financial_goal_id: input.financialGoalId ?? null,
        purchase_item_id: input.purchaseItemId  ?? null,
        created_by:       user?.id ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapGoal(data as Record<string, unknown>)
  },

  async update(id: string, input: Partial<{
    title:          string
    description:    string | null
    category:       AnnualGoalCategory
    priority:       AnnualGoalPriority
    status:         AnnualGoalStatus
    progressMode:   AnnualGoalProgressMode
    isFocus:        boolean
    targetDate:     string | null
    startedAt:      string | null
    notes:          string | null
    financialGoalId: string | null
    purchaseItemId:  string | null
  }>): Promise<AnnualGoal> {
    const patch: Record<string, unknown> = {}
    if (input.title          !== undefined) patch.title           = input.title
    if (input.description    !== undefined) patch.description     = input.description
    if (input.category       !== undefined) patch.category        = input.category
    if (input.priority       !== undefined) patch.priority        = input.priority
    if (input.status         !== undefined) patch.status          = input.status
    if (input.progressMode   !== undefined) patch.progress_mode   = input.progressMode
    if (input.isFocus        !== undefined) patch.is_focus        = input.isFocus
    if (input.targetDate     !== undefined) patch.target_date     = input.targetDate
    if (input.startedAt      !== undefined) patch.started_at      = input.startedAt
    if (input.notes          !== undefined) patch.notes           = input.notes
    if (input.financialGoalId !== undefined) patch.financial_goal_id = input.financialGoalId
    if (input.purchaseItemId  !== undefined) patch.purchase_item_id  = input.purchaseItemId

    const { data, error } = await supabase
      .from('annual_goals')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapGoal(data as Record<string, unknown>)
  },

  async completeGoal(id: string): Promise<AnnualGoal> {
    const { data, error } = await supabase.rpc('complete_annual_goal', { p_goal_id: id })
    if (error) throw new Error(error.message)
    return mapGoal(data as Record<string, unknown>)
  },

  async updateProgress(id: string, progress: number, status?: AnnualGoalStatus): Promise<AnnualGoal> {
    const { data, error } = await supabase.rpc('update_annual_goal_progress', {
      p_goal_id:  id,
      p_progress: progress,
      p_status:   status ?? null,
    })
    if (error) throw new Error(error.message)
    return mapGoal(data as Record<string, unknown>)
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('annual_goals').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async getSummary(workspaceId: string, year: number): Promise<AnnualGoalSummary> {
    const { data, error } = await supabase.rpc('get_annual_goals_summary', {
      p_workspace_id: workspaceId,
      p_year:         year,
    })
    if (error) throw new Error(error.message)
    return data as AnnualGoalSummary
  },

  // ─── Milestones ────────────────────────────────────────────

  async listMilestones(goalId: string): Promise<AnnualGoalMilestone[]> {
    const { data, error } = await supabase
      .from('annual_goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Record<string, unknown>[]).map(mapMilestone)
  },

  async createMilestone(input: {
    workspaceId: string
    goalId:      string
    title:       string
    description?: string
    targetDate?:  string
    sortOrder?:   number
  }): Promise<AnnualGoalMilestone> {
    const { data, error } = await supabase
      .from('annual_goal_milestones')
      .insert({
        workspace_id: input.workspaceId,
        goal_id:      input.goalId,
        title:        input.title,
        description:  input.description ?? null,
        target_date:  input.targetDate  ?? null,
        sort_order:   input.sortOrder   ?? 0,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapMilestone(data as Record<string, unknown>)
  },

  async toggleMilestone(milestoneId: string): Promise<AnnualGoalMilestone> {
    const { data, error } = await supabase.rpc('toggle_milestone', { p_milestone_id: milestoneId })
    if (error) throw new Error(error.message)
    return mapMilestone(data as Record<string, unknown>)
  },

  async deleteMilestone(milestoneId: string): Promise<void> {
    const { error } = await supabase.from('annual_goal_milestones').delete().eq('id', milestoneId)
    if (error) throw new Error(error.message)
  },
}
