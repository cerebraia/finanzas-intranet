import type { ReactNode } from 'react'
import { Zap } from 'lucide-react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-500/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-600/5 blur-3xl" />
      </div>

      {/* Logo + card */}
      <div className="relative w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 shadow-glow mx-auto">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-content-primary">Finanzas</p>
            <p className="text-xs text-content-muted">Intranet Financiera</p>
          </div>
        </div>

        {/* Content card */}
        <div className="rounded-2xl border border-base-border bg-base-surface p-6 shadow-glow backdrop-blur-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
