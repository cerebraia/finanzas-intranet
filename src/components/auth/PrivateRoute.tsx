import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface PrivateRouteProps {
  children: React.ReactNode
  requiredPath?: string
}

export function PrivateRoute({ children, requiredPath }: PrivateRouteProps) {
  const { isAuthenticated, isLoading, canAccessPath } = useAuth()
  const location = useLocation()

  // Esperar a que Supabase resuelva la sesión antes de redirigir
  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredPath && !canAccessPath(requiredPath)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
