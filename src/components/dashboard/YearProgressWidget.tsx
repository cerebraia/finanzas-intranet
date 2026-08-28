import { useNavigate } from 'react-router-dom'
import { Target, ArrowRight } from 'lucide-react'
import type { AnnualGoalSummary } from '@/types/annualGoals'

interface Props {
  summary: AnnualGoalSummary | null
  year:    number
}

function daysUntilEndOfYear(year: number): number {
  const end   = new Date(year, 11, 31)
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86_400_000))
}

export function YearProgressWidget({ summary, year }: Props) {
  const navigate = useNavigate()
  const daysLeft = daysUntilEndOfYear(year)

  if (!summary || summary.total === 0) {
    return (
      <div className="rounded-xl border border-base-border bg-base-surface p-4 text-center">
        <Target className="w-5 h-5 text-content-disabled mx-auto mb-2" />
        <p className="text-xs text-content-muted mb-2">Define tus prioridades para {year}</p>
        <button
          onClick={() => navigate('/metas-anuales')}
          className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          Crear metas →
        </button>
      </div>
    )
  }

  const pct = Math.round((summary.completed / summary.total) * 100)

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Target className="w-4 h-4 text-brand-400" />
          <p className="text-sm font-bold text-content-primary">Mi año {year}</p>
        </div>
        <button
          onClick={() => navigate('/metas-anuales')}
          className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 transition-colors font-medium"
        >
          Ver todo
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-content-muted">
            {summary.completed} de {summary.total} completadas
          </p>
          <p className="text-lg font-bold text-brand-400">{pct}%</p>
        </div>
        <div className="h-2 bg-base-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs font-bold text-emerald-400">{summary.completed}</p>
          <p className="text-[10px] text-content-muted">Completadas</p>
        </div>
        <div>
          <p className="text-xs font-bold text-brand-400">{summary.in_progress}</p>
          <p className="text-[10px] text-content-muted">En progreso</p>
        </div>
        <div>
          <p className="text-xs font-bold text-content-muted">{summary.not_started}</p>
          <p className="text-[10px] text-content-muted">Pendientes</p>
        </div>
      </div>

      {/* Days remaining */}
      <p className="mt-3 text-[10px] text-content-disabled text-center pt-2 border-t border-base-border">
        Quedan {daysLeft} días del año
      </p>
    </div>
  )
}
