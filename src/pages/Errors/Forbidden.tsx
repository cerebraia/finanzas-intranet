import { useNavigate } from 'react-router-dom'
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types/auth'

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrador',
  MANAGER: 'Manager', EMPLOYEE: 'Empleado', VIEWER: 'Viewer',
}

export function ForbiddenPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-base flex items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
          <ShieldX className="w-10 h-10 text-red-400" />
        </div>
        <div>
          <p className="text-6xl font-black text-red-400/50">403</p>
          <p className="text-xl font-bold text-content-primary mt-2">Acceso denegado</p>
          <p className="text-sm text-content-muted mt-1">
            No tienes permisos para acceder a esta sección.
          </p>
          {user && (
            <p className="text-xs text-content-disabled mt-2">
              Tu rol actual es: <span className="text-brand-400 font-medium">{ROLE_LABEL[user.role]}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all"
          >
            Dashboard
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 text-xs text-content-disabled hover:text-content-muted transition-colors"
        >
          <LogOut className="w-3 h-3" /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
