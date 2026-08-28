import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

export function StatCard({ label, value = '—', icon: Icon, trend, trendValue, className = '' }: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-content-muted',
  }

  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-content-muted uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-semibold text-content-primary truncate">{value}</p>
          {trendValue && trend && (
            <p className={`text-xs mt-1.5 font-medium ${trendColors[trend]}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 p-2.5 rounded-lg bg-brand-600/10 border border-brand-600/20">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
      </div>
    </Card>
  )
}
