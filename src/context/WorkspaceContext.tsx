import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { DateRange } from '@/types'
import type { WorkspaceRow } from '@/types/database.types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const WORKSPACE_KEY = 'finanzas:workspace:selected'

function currentMonthRange(): DateRange {
  const now = new Date()
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to:   new Date(now.getFullYear(), now.getMonth() + 1, 0),
  }
}

// Adaptar WorkspaceRow a la forma que usan los componentes existentes
export interface AppWorkspace {
  id:        string
  name:      string
  slug:      string
  type:      'PERSONAL' | 'BUSINESS'
  emoji:     string | null
  isActive:  boolean
  createdAt: string
  updatedAt: string
}

function rowToWorkspace(row: WorkspaceRow): AppWorkspace {
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

const EMPTY_WORKSPACE: AppWorkspace = {
  id: '', name: '', slug: '', type: 'PERSONAL', emoji: null,
  isActive: true, createdAt: '', updatedAt: '',
}

interface WorkspaceContextValue {
  workspaces:         AppWorkspace[]
  activeWorkspace:    AppWorkspace           // garantizado non-null (puede ser EMPTY_WORKSPACE mientras carga)
  setActiveWorkspace: (ws: AppWorkspace) => void
  dateRange:          DateRange
  setDateRange:       (range: DateRange) => void
  isLoading:          boolean
  refetch:            () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const [workspaces,      setWorkspaces]      = useState<AppWorkspace[]>([])
  const [activeWorkspace, setActiveWorkspaceState] = useState<AppWorkspace>(EMPTY_WORKSPACE)
  const [dateRange,       setDateRange]       = useState<DateRange>(currentMonthRange())
  const [isLoading,       setIsLoading]       = useState(false)

  async function fetchWorkspaces() {
    if (!user) return
    setIsLoading(true)
    try {
      // Obtener IDs de workspaces del usuario
      const { data: memberData, error } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)

      if (error || !memberData) return

      const wsIds = (memberData as { workspace_id: string }[]).map(m => m.workspace_id)
      if (wsIds.length === 0) return

      // Obtener workspaces activos
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', wsIds)
        .eq('is_active', true)
        .order('created_at')

      const list: AppWorkspace[] = ((wsData ?? []) as WorkspaceRow[]).map(rowToWorkspace)

      setWorkspaces(list)

      // Restaurar workspace seleccionado o tomar el primero
      const savedId = localStorage.getItem(WORKSPACE_KEY)
      const found   = savedId ? list.find(w => w.id === savedId) : null
      setActiveWorkspaceState(found ?? list[0] ?? EMPTY_WORKSPACE)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces()
    } else {
      setWorkspaces([])
      setActiveWorkspaceState(EMPTY_WORKSPACE)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id])

  function setActiveWorkspace(ws: AppWorkspace) {
    setActiveWorkspaceState(ws)
    localStorage.setItem(WORKSPACE_KEY, ws.id)
    queryClient.removeQueries()  // remove all cached data to avoid showing wrong workspace data
  }

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      setActiveWorkspace,
      dateRange,
      setDateRange,
      isLoading,
      refetch: fetchWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
