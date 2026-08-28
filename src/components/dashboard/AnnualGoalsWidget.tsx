import { useNavigate } from 'react-router-dom'
import { Star, Target, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnnualGoalsFocus } from '@/hooks/useAnnualGoals'

export function AnnualGoalsWidget() {
  const navigate = useNavigate()
  const { data: focusGoals = [], isLoading } = useAnnualGoalsFocus()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-base-border bg-base-surface p-4 animate-pulse h-32" />
    )
  }

  if (focusGoals.length === 0) return null

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
          <p className="text-xs font-bold text-content-primary uppercase tracking-wider">
            Mis metas
          </p>
        </div>
        <button
          onClick={() => navigate('/metas-anuales')}
          className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 transition-colors font-medium"
        >
          Ver todas
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Focus goals list */}
      <div className="space-y-2">
        {focusGoals.slice(0, 3).map(goal => (
          <div key={goal.id} className="flex items-center gap-2.5">
            <Target className="w-3.5 h-3.5 text-content-disabled flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-content-primary truncate">{goal.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1 bg-base-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <span className={cn('text-[10px] font-semibold tabular-nums flex-shrink-0', 'text-content-muted')}>
                  {goal.progress}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {focusGoals.length > 3 && (
        <p className="text-[10px] text-content-disabled mt-2 text-center">
          +{focusGoals.length - 3} más
        </p>
      )}
    </div>
  )
}
