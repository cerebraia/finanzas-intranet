import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const inputCls = cn(
  'w-full px-3 py-2.5 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/60 transition-all'
)

export function LoginPage() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = await login(email, password, remember)
    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error ?? 'Error al iniciar sesión')
    }
  }

  function fillDemo(role: string) {
    if (role === 'admin')   { setEmail('fernando@ads.com'); setPassword('admin123') }
    if (role === 'manager') { setEmail('manager@ads.com');  setPassword('manager123') }
    if (role === 'viewer')  { setEmail('viewer@ads.com');   setPassword('viewer123') }
  }

  return (
    <AuthLayout>
      <div className="space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-content-primary">Bienvenido</h1>
          <p className="text-sm text-content-muted mt-1">Inicia sesión en tu cuenta</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-xs font-medium text-content-muted mb-1.5 block">Correo electrónico</label>
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className={inputCls}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-content-muted mb-1.5 block">Contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(inputCls, 'pr-10')}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-content-disabled hover:text-content-muted transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-3.5 h-3.5 rounded border border-base-border accent-brand-600"
              />
              <span className="text-xs text-content-muted">Recordarme</span>
            </label>
            <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : 'Iniciar sesión'}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-xs text-content-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Crear cuenta
          </Link>
        </p>

        {/* Demo accounts */}
        <div className="border-t border-base-border pt-4">
          <p className="text-[10px] text-center text-content-disabled mb-2 uppercase tracking-wider">Cuentas de demostración</p>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Admin', role: 'admin' },
              { label: 'Manager', role: 'manager' },
              { label: 'Viewer', role: 'viewer' },
            ].map(d => (
              <button
                key={d.role}
                type="button"
                onClick={() => fillDemo(d.role)}
                className="py-1.5 px-2 rounded-lg border border-base-border text-[10px] font-medium text-content-muted hover:text-content-primary hover:bg-base-hover hover:border-brand-600/30 transition-all"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
