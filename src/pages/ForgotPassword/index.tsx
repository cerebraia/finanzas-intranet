import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const inputCls = cn(
  'w-full px-3 py-2.5 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/60 transition-all'
)

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email,     setEmail]     = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const result = await resetPassword(email)
    setIsLoading(false)
    if (result.success) setSent(true)
    else setError(result.error ?? 'Error al enviar el enlace')
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="py-4 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-content-primary">Enlace enviado</p>
            <p className="text-sm text-content-muted mt-1">
              Si <strong className="text-content-secondary">{email}</strong> está registrado,
              recibirás un enlace para restablecer tu contraseña.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-base-elevated border border-base-border text-xs text-content-muted">
            Revisa tu bandeja de entrada (y spam) para el enlace de recuperación.
          </div>
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver al login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-content-primary">Recuperar contraseña</h1>
          <p className="text-sm text-content-muted mt-1">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {error && (
          <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-content-muted mb-1.5 block">Correo electrónico</label>
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className={inputCls}
            />
          </div>

          <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Enviar enlace de recuperación'}
          </button>
        </form>

        <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al login
        </Link>
      </div>
    </AuthLayout>
  )
}
