import { supabase } from '@/lib/supabase'
import type { CategoryRow } from '@/types/database.types'
import type { ApiCategory, CategoryType } from '@/types/api'

function rowToApi(row: CategoryRow): ApiCategory {
  return {
    id:          row.id,
    workspaceId: row.workspace_id,
    name:        row.name,
    type:        row.type,
    icon:        row.icon,
    color:       null,
    isActive:    row.is_active,
  }
}

export const categoriesService = {
  async list(workspaceId?: string, type?: CategoryType): Promise<ApiCategory[]> {
    let query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (type) query = query.eq('type', type)

    if (workspaceId) {
      query = query.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    } else {
      query = query.is('workspace_id', null)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return ((data ?? []) as CategoryRow[]).map(rowToApi)
  },

  async create(input: {
    workspaceId?: string
    name:  string
    type:  CategoryType
    icon?: string
    color?: string
  }): Promise<ApiCategory> {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        workspace_id: input.workspaceId ?? null,
        name:         input.name,
        type:         input.type,
        icon:         input.icon ?? null,
        is_system:    false,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return rowToApi(data as CategoryRow)
  },
}
