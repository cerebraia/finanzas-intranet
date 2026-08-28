import { useState } from 'react'
import {
  CheckCircle2, Circle, Star, AlertTriangle, Clock,
  MoreVertical, Edit, Milestone, Trash2, Pause, XCircle,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import { CATEGORY_LABEL, STATUS_LABEL, PRIORITY_LABEL } from '@/types/annualGoals'
import { useAnnualGoals } from '@/hooks/useAnnualGoals'
import type { AnnualGoal } from '@/types/annualGoals'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_CLS: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/20',
  HIGH:     'bg-amber-500/15 text-amber-400 border-amber-500/20',
  MEDIUM:   'bg-sky-500/15 text-sky-400 border-sky-500/20',
  LOW:      'bg-base-elevated text-content-muted border-base-border',
}

const STATUS_CLS: Record<string, string> = {
  NOT_STARTED: 'bg-base-elevated text-content-muted border-base-border',
  IN_PROGRESS: 'bg-brand-600/15 text-brand-400 border-brand-600/25',
  COMPLETED:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  PAUSED:      'bg-amber-500/15 text-amber-400 border-amber-500/20',
  CANCELLED:   'bg-red-500/10 text-red-400 border-red-500/15',
}

const CATEGORY_COLOR: Record<string, string> = {
  PERSONAL:  'bg-violet-500/15 text-violet-400',
  FAMILY:    'bg-pink-500/15 text-pink-400',
  FINANCIAL: 'bg-emerald-500/15 text-emerald-400',
  BUSINESS:  'bg-blue-500/15 text-blue-400',
  HEALTH:    'bg-rose-500/15 text-rose-400',
  EDUCATION: 'bg-amber-500/15 text-amber-400',
  PURCHASE:  'bg-orange-500/15 text-orange-400',
  TRAVEL:    'bg-sky-500/15 text-sky-400',
  PROJECT:   'bg-indigo-500/15 text-indigo-400',
  OTHER:     'bg-base-elevated text-content-muted',
}

interface GoalCardProps {
  goal:                 AnnualGoal
  overdue:              boolean
  dueSoon:              boolean
  onComplete:           () => void
  onUpdateProgress:     () => void
  onManageMilestones:   () => void
  onDelete:             () => void
}

export function GoalCard({
  goal, overdue, dueSoon,
  onComplete, onUpdateProgress, onManageMilestones, onDelete,
}: GoalCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const year = goal.year
  const { update } = useAnnualGoals(year)

  const isDone      = goal.status === 'COMPLETED'
  const isCancelled = goal.status === 'CANCELLED'
  const dimmed      = isDone || isCancelled

  function handleQuickComplete() {
    if (isDone) return
    setConfirmComplete(true)
  }

  function handleToggleFocus() {
    update(goal.id, { isFocus: !goal.isFocus })
  }

  function handlePause() {
    update(goal.id, { status: goal.status === 'PAUSED' ? 'IN_PROGRESS' : 'PAUSED' })
  }

  function handleCancel() {
    update(goal.id, { status: 'CANCELLED' })
  }

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <>
      <div
        className={cn(
          'rounded-xl border bg-base-surface p-4 flex flex-col gap-3 transition-all',
          dimmed ? 'border-base-border opacity-60' : 'border-base-border hover:border-brand-600/30',
          overdue && !dimmed && 'border-red-500/30',
        )}
      >
        {/* ── Top row ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-2">
          {/* Quick complete button */}
          <button
            onClick={handleQuickComplete}
            disabled={isDone || isCancelled}
            className={cn(
              'flex-shrink-0 mt-0.5 transition-colors',
              isDone
                ? 'text-emerald-400 cursor-default'
                : 'text-content-disabled hover:text-brand-400',
            )}
            title={isDone ? 'Completada' : 'Marcar como completada'}
          >
            {isDone
              ? <CheckCircle2 className="w-5 h-5" />
              : <Circle className="w-5 h-5" />
            }
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-semibold leading-snug',
              isDone ? 'line-through text-content-muted' : 'text-content-primary',
            )}>
              {goal.title}
            </p>
            {goal.description && (
              <p className="text-xs text-content-muted mt-0.5 line-clamp-2">{goal.description}</p>
            )}
          </div>

          {/* Actions menu */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Focus star */}
            {!dimmed && (
              <button
                onClick={handleToggleFocus}
                className={cn(
                  'p-1 rounded-lg transition-colors',
                  goal.isFocus
                    ? 'text-amber-400'
                    : 'text-content-disabled hover:text-amber-400',
                )}
                title={goal.isFocus ? 'Quitar de enfoque' : 'Marcar como enfoque'}
              >
                <Star className="w-3.5 h-3.5" fill={goal.isFocus ? 'currentColor' : 'none'} />
              </button>
            )}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-1 rounded-lg text-content-disabled hover:text-content-primary hover:bg-base-hover transition-colors">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[160px] rounded-xl border border-base-border bg-base-surface p-1 shadow-xl animate-in fade-in-0 zoom-in-95"
                  sideOffset={4}
                  align="end"
                >
                  {!isDone && !isCancelled && (
                    <>
                      <MenuItem icon={Edit} label="Actualizar progreso" onClick={onUpdateProgress} />
                      <MenuItem icon={Milestone} label="Gestionar hitos" onClick={onManageMilestones} />
                      <MenuItem icon={Pause} label={goal.status === 'PAUSED' ? 'Reanudar' : 'Pausar'} onClick={handlePause} />
                      <MenuItem icon={CheckCircle2} label="Completar" onClick={handleQuickComplete} />
                      <DropdownMenu.Separator className="my-1 h-px bg-base-border" />
                      <MenuItem icon={XCircle} label="Cancelar meta" onClick={handleCancel} danger />
                    </>
                  )}
                  <MenuItem icon={Trash2} label="Eliminar" onClick={() => setConfirmDelete(true)} danger />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>

        {/* ── Badges ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', CATEGORY_COLOR[goal.category])}>
            {CATEGORY_LABEL[goal.category]}
          </span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold border', STATUS_CLS[goal.status])}>
            {STATUS_LABEL[goal.status]}
          </span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold border', PRIORITY_CLS[goal.priority])}>
            {PRIORITY_LABEL[goal.priority]}
          </span>
          {overdue && !dimmed && (
            <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
              <AlertTriangle className="w-2.5 h-2.5" />
              Atrasada
            </span>
          )}
          {dueSoon && !overdue && !dimmed && (
            <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-2.5 h-2.5" />
              Próxima
            </span>
          )}
        </div>

        {/* ── Progress bar ─────────────────────────────────────── */}
        {!isCancelled && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-content-muted">Progreso</span>
              <span className="text-[10px] font-semibold text-content-primary">{goal.progress}%</span>
            </div>
            <div className="h-1.5 bg-base-elevated rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isDone ? 'bg-emerald-500' : 'bg-brand-600',
                )}
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Footer: date ─────────────────────────────────────── */}
        {goal.targetDate && (
          <div className="flex items-center gap-1 text-[11px] text-content-muted">
            <Clock className="w-3 h-3" />
            <span>Fecha objetivo: {formatDate(goal.targetDate)}</span>
          </div>
        )}
      </div>

      {/* ── Confirm dialogs ──────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar meta"
        description={`¿Eliminar "${goal.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => { onDelete(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={confirmComplete}
        title="Completar meta"
        description={`¿Quieres marcar "${goal.title}" como completada?`}
        confirmLabel="Completar"
        variant="warning"
        onConfirm={() => { onComplete(); setConfirmComplete(false) }}
        onCancel={() => setConfirmComplete(false)}
      />
    </>
  )
}

function MenuItem({
  icon: Icon, label, onClick, danger = false,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <DropdownMenu.Item
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer outline-none transition-colors',
        danger
          ? 'text-red-400 hover:bg-red-500/10 focus:bg-red-500/10'
          : 'text-content-muted hover:text-content-primary hover:bg-base-hover focus:bg-base-hover',
      )}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </DropdownMenu.Item>
  )
}
