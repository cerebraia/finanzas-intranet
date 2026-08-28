import { useState, useMemo } from 'react'
import {
  Target, Plus, Calendar, Star, AlertTriangle, Clock, CheckCircle2,
  TrendingUp, Filter, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnnualGoals } from '@/hooks/useAnnualGoals'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  CATEGORY_LABEL, STATUS_LABEL,
} from '@/types/annualGoals'
import type { AnnualGoal, AnnualGoalCategory, AnnualGoalStatus } from '@/types/annualGoals'
import { NewAnnualGoalModal } from './NewAnnualGoalModal'
import { UpdateProgressModal } from './UpdateProgressModal'
import { ManageMilestonesModal } from './ManageMilestonesModal'
import { GoalCard } from './GoalCard'

// ─── helpers ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()

function daysUntilEndOfYear(year: number): number {
  const endOfYear = new Date(year, 11, 31)
  const today     = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((endOfYear.getTime() - today.getTime()) / 86_400_000))
}

function isOverdue(goal: AnnualGoal): boolean {
  if (!goal.targetDate) return false
  if (goal.status === 'COMPLETED' || goal.status === 'CANCELLED') return false
  return goal.targetDate < new Date().toISOString().slice(0, 10)
}

function isDueSoon(goal: AnnualGoal): boolean {
  if (!goal.targetDate || goal.status === 'COMPLETED' || goal.status === 'CANCELLED') return false
  const in30 = new Date()
  in30.setDate(in30.getDate() + 30)
  const td = new Date(goal.targetDate)
  return td >= new Date() && td <= in30
}

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

function sortPending(goals: AnnualGoal[]): AnnualGoal[] {
  return [...goals].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 4
    const pb = PRIORITY_ORDER[b.priority] ?? 4
    if (pa !== pb) return pa - pb
    if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate)
    if (a.targetDate) return -1
    if (b.targetDate) return 1
    return 0
  })
}

const ALL_CATEGORIES: AnnualGoalCategory[] = [
  'PERSONAL','FAMILY','FINANCIAL','BUSINESS',
  'HEALTH','EDUCATION','PURCHASE','TRAVEL','PROJECT','OTHER',
]

const ALL_STATUSES: AnnualGoalStatus[] = [
  'NOT_STARTED','IN_PROGRESS','COMPLETED','PAUSED','CANCELLED',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AnnualGoalsPage() {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const [year,          setYear]          = useState(CURRENT_YEAR)
  const [catFilter,     setCatFilter]     = useState<AnnualGoalCategory | 'ALL'>('ALL')
  const [statusFilter,  setStatusFilter]  = useState<AnnualGoalStatus | 'ALL'>('ALL')
  const [showOnlyLeft,  setShowOnlyLeft]  = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [newGoalOpen,   setNewGoalOpen]   = useState(false)

  const [progressGoal,     setProgressGoal]     = useState<AnnualGoal | null>(null)
  const [milestonesGoal,   setMilestonesGoal]   = useState<AnnualGoal | null>(null)

  const { goals, summary, isLoading, complete, remove } = useAnnualGoals(year)

  const daysLeft = daysUntilEndOfYear(year)

  // ─── derived ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = goals
    if (catFilter !== 'ALL')    list = list.filter(g => g.category === catFilter)
    if (statusFilter !== 'ALL') list = list.filter(g => g.status === statusFilter)
    if (showOnlyLeft) list = list.filter(g => g.status !== 'COMPLETED' && g.status !== 'CANCELLED')
    return list
  }, [goals, catFilter, statusFilter, showOnlyLeft])

  const pending      = useMemo(() => sortPending(goals.filter(g => g.status === 'NOT_STARTED' || g.status === 'IN_PROGRESS')), [goals])
  const overdue      = useMemo(() => goals.filter(isOverdue), [goals])
  const dueSoon      = useMemo(() => goals.filter(isDueSoon), [goals])

  const completedPct = summary && summary.total > 0
    ? Math.round((summary.completed / summary.total) * 100)
    : 0

  // Year selector: current ± 2
  const yearOptions = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-brand-400" />
            <h1 className="text-xl font-bold text-content-primary">Metas {year}</h1>
          </div>
          <p className="text-sm text-content-muted">¿Qué quieres lograr este año?</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-base-elevated border border-base-border rounded-lg p-0.5">
            {yearOptions.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  year === y
                    ? 'bg-brand-600 text-white'
                    : 'text-content-muted hover:text-content-primary'
                )}
              >
                {y}
              </button>
            ))}
          </div>
          <button
            onClick={() => setNewGoalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva meta
          </button>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label="Total" value={summary.total}       color="brand"   icon={Target} />
          <KpiTile label="Completadas" value={summary.completed} color="success" icon={CheckCircle2} />
          <KpiTile label="En progreso" value={summary.in_progress} color="info"  icon={TrendingUp} />
          <KpiTile label="Pendientes"  value={summary.not_started} color="muted" icon={Clock} />
        </div>
      )}

      {/* ── Progreso del año ────────────────────────────────────── */}
      {summary && summary.total > 0 && (
        <div className="rounded-xl border border-base-border bg-base-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-content-primary">Progreso del año</p>
              <p className="text-xs text-content-muted mt-0.5">
                {summary.completed} de {summary.total} metas completadas
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-brand-400">{completedPct}%</p>
              {year === CURRENT_YEAR && (
                <p className="text-xs text-content-muted">Quedan {daysLeft} días</p>
              )}
            </div>
          </div>
          <div className="h-2 bg-base-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${completedPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Alertas: atrasadas y próximas ───────────────────────── */}
      {overdue.length > 0 && (
        <AlertStrip
          icon={AlertTriangle}
          color="red"
          label={`${overdue.length} meta${overdue.length > 1 ? 's' : ''} atrasada${overdue.length > 1 ? 's' : ''}`}
        />
      )}
      {dueSoon.length > 0 && (
        <AlertStrip
          icon={Calendar}
          color="amber"
          label={`${dueSoon.length} meta${dueSoon.length > 1 ? 's' : ''} vence${dueSoon.length > 1 ? 'n' : ''} en los próximos 30 días`}
        />
      )}

      {/* ── Lo que me falta por lograr ──────────────────────────── */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-content-primary uppercase tracking-wider">
              Lo que me falta por lograr
            </h2>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold">
              {pending.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pending.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                overdue={isOverdue(goal)}
                dueSoon={isDueSoon(goal)}
                onComplete={() => complete(goal.id)}
                onUpdateProgress={() => setProgressGoal(goal)}
                onManageMilestones={() => setMilestonesGoal(goal)}
                onDelete={() => remove(goal.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Todos los objetivos ─────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-content-primary uppercase tracking-wider">
            Todos los objetivos
          </h2>

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-content-muted" />

            {/* Categoría */}
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value as AnnualGoalCategory | 'ALL')}
              className="text-xs bg-base-elevated border border-base-border rounded-lg px-2 py-1.5 text-content-primary focus:outline-none focus:border-brand-600"
            >
              <option value="ALL">Todas las categorías</option>
              {ALL_CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>

            {/* Estado */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as AnnualGoalStatus | 'ALL')}
              className="text-xs bg-base-elevated border border-base-border rounded-lg px-2 py-1.5 text-content-primary focus:outline-none focus:border-brand-600"
            >
              <option value="ALL">Todos los estados</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>

            {/* Toggle: solo pendientes */}
            <button
              onClick={() => setShowOnlyLeft(v => !v)}
              className={cn(
                'text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors',
                showOnlyLeft
                  ? 'bg-brand-600/20 text-brand-400 border-brand-600/30'
                  : 'bg-base-elevated text-content-muted border-base-border hover:text-content-primary'
              )}
            >
              Lo que queda del año
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState year={year} onNew={() => setNewGoalOpen(true)} />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered
                .filter(g => g.status !== 'COMPLETED' || showCompleted)
                .map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    overdue={isOverdue(goal)}
                    dueSoon={isDueSoon(goal)}
                    onComplete={() => complete(goal.id)}
                    onUpdateProgress={() => setProgressGoal(goal)}
                    onManageMilestones={() => setMilestonesGoal(goal)}
                    onDelete={() => remove(goal.id)}
                  />
                ))}
            </div>

            {/* Toggle mostrar completadas */}
            {filtered.some(g => g.status === 'COMPLETED') && (
              <button
                onClick={() => setShowCompleted(v => !v)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-content-muted hover:text-content-primary transition-colors"
              >
                {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showCompleted
                  ? 'Ocultar completadas'
                  : `Ver ${filtered.filter(g => g.status === 'COMPLETED').length} completadas`
                }
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Resumen por categoría ───────────────────────────────── */}
      {goals.length > 0 && (
        <CategorySummary goals={goals} />
      )}

      {/* ── Modales ─────────────────────────────────────────────── */}
      <NewAnnualGoalModal
        open={newGoalOpen}
        onClose={() => setNewGoalOpen(false)}
        workspaceId={wsId}
        year={year}
      />
      {progressGoal && (
        <UpdateProgressModal
          goal={progressGoal}
          onClose={() => setProgressGoal(null)}
          workspaceId={wsId}
          year={year}
        />
      )}
      {milestonesGoal && (
        <ManageMilestonesModal
          goal={milestonesGoal}
          onClose={() => setMilestonesGoal(null)}
          workspaceId={wsId}
          year={year}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiTile({
  label, value, color, icon: Icon,
}: {
  label: string
  value: number
  color: 'brand' | 'success' | 'info' | 'muted'
  icon: React.ElementType
}) {
  const colorCls = {
    brand:   'text-brand-400 bg-brand-600/10 border-brand-600/20',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    info:    'text-sky-400 bg-sky-500/10 border-sky-500/20',
    muted:   'text-content-muted bg-base-elevated border-base-border',
  }[color]

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center border', colorCls)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs text-content-muted font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-content-primary">{value}</p>
    </div>
  )
}

function AlertStrip({ icon: Icon, color, label }: { icon: React.ElementType; color: 'red' | 'amber'; label: string }) {
  const cls = color === 'red'
    ? 'bg-red-500/10 border-red-500/20 text-red-400'
    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
  return (
    <div className={cn('flex items-center gap-2 rounded-xl border px-4 py-2.5', cls)}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

function CategorySummary({ goals }: { goals: AnnualGoal[] }) {
  const byCategory = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {}
    for (const g of goals) {
      if (!map[g.category]) map[g.category] = { total: 0, completed: 0 }
      map[g.category].total++
      if (g.status === 'COMPLETED') map[g.category].completed++
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [goals])

  return (
    <section>
      <h2 className="text-sm font-bold text-content-primary uppercase tracking-wider mb-3">
        Resumen por categoría
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        {byCategory.map(([cat, { total, completed }]) => {
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0
          return (
            <div key={cat} className="rounded-xl border border-base-border bg-base-surface p-3">
              <p className="text-xs font-semibold text-content-primary mb-0.5">
                {CATEGORY_LABEL[cat as AnnualGoalCategory]}
              </p>
              <p className="text-[10px] text-content-muted mb-2">
                {completed}/{total} completadas
              </p>
              <div className="h-1.5 bg-base-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EmptyState({ year, onNew }: { year: number; onNew: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-base-border bg-base-surface/50 p-10 text-center">
      <Target className="w-8 h-8 text-content-disabled mx-auto mb-3" />
      <p className="text-sm font-medium text-content-muted mb-1">No hay metas para {year}</p>
      <p className="text-xs text-content-disabled mb-4">Define lo que quieres lograr este año</p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Crear primera meta
      </button>
    </div>
  )
}
