import { supabase } from '@/lib/supabase'
import type { AppWorkspace } from '@/context/WorkspaceContext'

interface WorkspaceRow {
  id:         string
  name:       string
  slug:       string
  type:       'PERSONAL' | 'BUSINESS'
  emoji:      string | null
  is_active:  boolean
  created_at: string
  updated_at: string
}

function rowToApp(row: WorkspaceRow): AppWorkspace {
  return {
    id:        row.id,
    name:      row.name,
    slug:      row.slug,
    type:      row.type,
    emoji:     row.emoji,
    isActive:  row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const workspacesService = {
  async listForUser(userId: string): Promise<AppWorkspace[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspaces:workspace_id (*)')
      .eq('user_id', userId)

    if (error) throw new Error(error.message)

    return ((data ?? []) as unknown as { workspaces: WorkspaceRow | null }[])
      .map(m => m.workspaces)
      .filter((w): w is WorkspaceRow => w !== null && w.is_active)
      .map(rowToApp)
  },

  async create(name: string, slug: string, type: 'PERSONAL' | 'BUSINESS', emoji?: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_workspace_with_owner', {
      p_name:  name,
      p_slug:  slug,
      p_type:  type,
      p_emoji: emoji ?? null,
    })

    if (error) throw new Error(error.message)
    return data as string
  },
}
