import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
}

export function EmptyState({
  icon: Icon = Construction,
  title = 'En construcción',
  description = 'Este módulo estará disponible próximamente.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="p-4 rounded-2xl bg-brand-600/10 border border-brand-600/20 mb-5">
        <Icon className="w-8 h-8 text-brand-400" />
      </div>
      <h3 className="text-base font-semibold text-content-primary mb-1">{title}</h3>
      <p className="text-sm text-content-muted max-w-xs">{description}</p>
    </div>
  )
}
