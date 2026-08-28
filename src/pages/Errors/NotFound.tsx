import { useNavigate } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh bg-base flex items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-base-elevated border border-base-border flex items-center justify-center mx-auto">
          <FileQuestion className="w-10 h-10 text-content-disabled" />
        </div>
        <div>
          <p className="text-6xl font-black text-content-disabled">404</p>
          <p className="text-xl font-bold text-content-primary mt-2">Página no encontrada</p>
          <p className="text-sm text-content-muted mt-1">La página que buscas no existe o fue movida.</p>
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
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
