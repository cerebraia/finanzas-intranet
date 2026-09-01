import type { ReactNode } from 'react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex">
      {/* ── Panel izquierdo — navy brand ─────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] p-12"
        style={{ backgroundColor: 'var(--myd-navy)' }}
      >
        {/* Logo */}
        <img
          src="/logo-myd3000.svg"
          alt="MYD3000"
          className="h-9 w-auto object-contain object-left"
          draggable={false}
        />

        {/* Tagline */}
        <div>
          <p className="text-2xl font-semibold text-white leading-snug mb-3">
            Gestión financiera<br />interna MYD3000.
          </p>
          <p className="text-sm text-white/45">
            Acceso restringido — solo personal autorizado.
          </p>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-white/25">
          © {new Date().getFullYear()} MYD3000. Sistema interno.
        </p>
      </div>

      {/* ── Panel derecho — formulario ───────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-base p-6">
        {/* Logo mobile (solo visible < lg) */}
        <div className="lg:hidden mb-8">
          <img
            src="/logo-myd3000-dark.svg"
            alt="MYD3000"
            className="h-8 w-auto object-contain"
            draggable={false}
          />
        </div>

        {/* Card del formulario */}
        <div className="w-full max-w-sm bg-base-surface border border-base-border rounded-xl shadow-card p-8">
          {children}
        </div>

        <p className="mt-6 text-[11px] text-content-disabled">
          © {new Date().getFullYear()} MYD3000 — Uso interno
        </p>
      </div>
    </div>
  )
}
