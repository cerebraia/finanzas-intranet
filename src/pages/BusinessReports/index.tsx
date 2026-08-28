import { BarChart3 } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui'

export function BusinessReportsPage() {
  return (
    <div>
      <PageHeader title="Reportes Negocio" description="Análisis y reportes del negocio" />
      <EmptyState icon={BarChart3} title="Reportes Negocio" description="Aquí encontrarás reportes detallados de tu negocio." />
    </div>
  )
}
