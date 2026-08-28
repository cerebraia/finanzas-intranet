import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { cn } from '@/lib/utils'

const inputCls = cn(
  'w-full px-3 py-2.5 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/60 transition-all'
)

export function RegisterPage() {
  const navigate = useNavigate()
  const [firstName,  setFirstName]  = useState('')
  const [lastName,   setLastName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [workspace,  setWorkspace]  = useState('personal')
  const [showPwd,    setShowPwd]    = useState(false)
  const [isLoading,  setIsLoading]  = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const pwdMatch = password === confirm && confirm.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres'); return }

    setIsLoading(true)
    setError(null)
    await new Promise(r => setTimeout(r, 800))
    setIsLoading(false)
    setSuccess(true)
    setTimeout(() => navigate('/login'), 2000)
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="py-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <p className="text-base font-semibold text-content-primary">¡Cuenta creada!</p>
          <p className="text-sm text-content-muted">Redirigiendo al login...</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-content-primary">Crear cuenta</h1>
          <p className="text-sm text-content-muted mt-1">Completa los datos para registrarte</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-content-muted mb-1.5 block">Nombre *</label>
              <input required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Fernando" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-content-muted mb-1.5 block">Apellido *</label>
              <input required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="López" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-content-muted mb-1.5 block">Correo electrónico *</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-medium text-content-muted mb-1.5 block">Workspace inicial</label>
            <select value={workspace} onChange={e => setWorkspace(e.target.value)} className={inputCls}>
              <option value="personal">Personal</option>
              <option value="business">Negocio</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-content-muted mb-1.5 block">Contraseña *</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} required minLength={6}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" className={cn(inputCls, 'pr-10')}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-disabled hover:text-content-muted">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-content-muted mb-1.5 block">Confirmar contraseña *</label>
            <div className="relative">
              <input
                type="password" required
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                className={cn(inputCls, 'pr-10', confirm && (pwdMatch ? 'border-emerald-500/50' : 'border-red-500/50'))}
              />
              {confirm && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {pwdMatch
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <AlertCircle  className="w-4 h-4 text-red-400" />}
                </span>
              )}
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-1">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando cuenta...</> : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-xs text-content-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
