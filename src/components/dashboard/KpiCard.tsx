import type { KpiMetric, ColorVariant } from '@/types'
import { cn } from '@/lib/utils'

const variantStyles: Record<ColorVariant, { icon: string; trend: string; border: string }> = {
  default: {
    icon:   'bg-base-elevated border-base-border text-content-muted',
    trend:  'text-content-muted',
    border: '',
  },
  success: {
    icon:   'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    trend:  'text-emerald-400',
    border: '',
  },
  danger: {
    icon:   'bg-red-500/10 border-red-500/20 text-red-400',
    trend:  'text-red-400',
    border: '',
  },
  warning: {
    icon:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    trend:  'text-amber-400',
    border: '',
  },
  info: {
    icon:   'bg-brand-600/10 border-brand-600/20 text-brand-400',
    trend:  'text-brand-400',
    border: '',
  },
}

const trendSymbol = { up: '↑', down: '↓', neutral: '→' } as const

interface KpiCardProps {
  metric: KpiMetric
  className?: string
}

export function KpiCard({ metric, className }: KpiCardProps) {
  const { label, value, icon: Icon, trend, trendValue, trendLabel, subtitle, colorVariant = 'default' } = metric
  const styles = variantStyles[colorVariant]

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-base-border bg-base-surface p-4 md:p-5',
        'hover:border-brand-600/30 hover:bg-base-elevated transition-all duration-200',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 leading-none">
            {label}
          </p>
          <p className="text-2xl font-bold text-content-primary tabular-nums leading-none mb-2">
            {value}
          </p>
          {(trendValue && trend) && (
            <p className={cn('text-xs font-medium flex items-center gap-1', styles.trend)}>
              <span>{trendSymbol[trend]}</span>
              <span>{trendValue}</span>
              {trendLabel && <span className="text-content-muted font-normal">{trendLabel}</span>}
            </p>
          )}
          {subtitle && !trendValue && (
            <p className="text-xs text-content-muted">{subtitle}</p>
          )}
        </div>

        <div className={cn('flex-shrink-0 p-2.5 rounded-lg border', styles.icon)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  )
}
