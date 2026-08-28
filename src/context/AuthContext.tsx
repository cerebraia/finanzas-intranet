import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserRole, Permission } from '@/types/auth'
import { ROLE_PERMISSIONS, ROLE_NAV_GROUPS } from '@/types/auth'
import type { ProfileRow, WorkspaceMemberRole } from '@/types/database.types'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AppUser {
  id:          string
  firstName:   string
  lastName:    string
  email:       string
  avatarUrl:   string | null
  role:        UserRole
  workspaceId: string
  status:      'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt:   string
}

interface AuthResult { success: boolean; error?: string }

interface AuthContextValue {
  user:            AppUser | null
  session:         Session | null
  profile:         ProfileRow | null
  isLoading:       boolean
  isAuthenticated: boolean
  signIn:          (email: string, password: string) => Promise<AuthResult>
  signOut:         () => Promise<void>
  resetPassword:   (email: string) => Promise<AuthResult>
  hasPermission:   (perm: Permission) => boolean
  hasRole:         (roles: UserRole[]) => boolean
  canAccessPath:   (path: string) => boolean
  updateProfile:   (data: Partial<Pick<ProfileRow, 'first_name' | 'last_name' | 'avatar_url'>>) => Promise<void>
  // alias for backward compat
  login:           (email: string, password: string, remember?: boolean) => Promise<AuthResult>
  logout:          () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function supabaseUserToApp(
  supaUser: SupabaseUser,
  profile: ProfileRow | null,
  memberRole: WorkspaceMemberRole | null,
  workspaceId: string,
): AppUser {
  const roleMap: Record<WorkspaceMemberRole, UserRole> = {
    OWNER:   'ADMIN',
    ADMIN:   'ADMIN',
    MANAGER: 'MANAGER',
    VIEWER:  'VIEWER',
  }
  return {
    id:          supaUser.id,
    firstName:   profile?.first_name ?? supaUser.email?.split('@')[0] ?? '',
    lastName:    profile?.last_name  ?? '',
    email:       supaUser.email      ?? '',
    avatarUrl:   profile?.avatar_url ?? null,
    role:        memberRole ? roleMap[memberRole] : 'VIEWER',
    workspaceId,
    status:      'ACTIVE',
    createdAt:   supaUser.created_at,
  }
}

async function loadProfileAndMember(supaUser: SupabaseUser): Promise<{
  profile:     ProfileRow | null
  memberRole:  WorkspaceMemberRole | null
  workspaceId: string
}> {
  const [profileResult, memberResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', supaUser.id).single(),
    supabase
      .from('workspace_members')
      .select('role, workspace_id')
      .eq('user_id', supaUser.id)
      .limit(1)
      .single(),
  ])

  return {
    profile:     profileResult.data ?? null,
    memberRole:  (memberResult.data?.role as WorkspaceMemberRole) ?? null,
    workspaceId: memberResult.data?.workspace_id ?? '',
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session,   setSession]   = useState<Session | null>(null)
  const [user,      setUser]      = useState<AppUser | null>(null)
  const [profile,   setProfile]   = useState<ProfileRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession()
      .then(async ({ data: { session: s } }) => {
        setSession(s)
        if (s?.user) {
          const { profile: p, memberRole, workspaceId } = await loadProfileAndMember(s.user)
          setProfile(p)
          setUser(supabaseUserToApp(s.user, p, memberRole, workspaceId))
        }
        setIsLoading(false)
      })
      .catch(() => {
        // Network error (Failed to fetch, CORS, etc.) — unblock the loading state
        setIsLoading(false)
      })

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      if (s?.user) {
        const { profile: p, memberRole, workspaceId } = await loadProfileAndMember(s.user)
        setProfile(p)
        setUser(supabaseUserToApp(s.user, p, memberRole, workspaceId))
      } else {
        setProfile(null)
        setUser(null)
      }
      if (event === 'INITIAL_SESSION') setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: error.message }
      return { success: true }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    queryClient.clear()
    setUser(null)
    setSession(null)
    setProfile(null)
  }, [queryClient])

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }, [])

  const updateProfile = useCallback(async (
    data: Partial<Pick<ProfileRow, 'first_name' | 'last_name' | 'avatar_url'>>
  ) => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...data } : null)
      setUser(prev => prev ? {
        ...prev,
        firstName: data.first_name ?? prev.firstName,
        lastName:  data.last_name  ?? prev.lastName,
        avatarUrl: data.avatar_url !== undefined ? data.avatar_url : prev.avatarUrl,
      } : null)
    }
  }, [user])

  const hasPermission = useCallback((perm: Permission): boolean => {
    if (!user) return false
    const perms = ROLE_PERMISSIONS[user.role]
    return perms.includes('admin:all') || perms.includes(perm)
  }, [user])

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  const canAccessPath = useCallback((path: string): boolean => {
    if (!user) return false
    const allowed = ROLE_NAV_GROUPS[user.role]
    if (allowed.includes('*')) return true
    return allowed.some(p => path === p || (p !== '/' && path.startsWith(p)))
  }, [user])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signOut,
      resetPassword,
      updateProfile,
      hasPermission,
      hasRole,
      canAccessPath,
      // backward-compat aliases
      login:  signIn,
      logout: () => { signOut() },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
