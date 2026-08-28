import { BadgeDollarSign } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui'

export function CardsPage() {
  return (
    <div>
      <PageHeader title="Tarjetas" description="Gestión de tarjetas de crédito y débito" />
      <EmptyState icon={BadgeDollarSign} title="Tarjetas" description="Aquí podrás gestionar tus tarjetas." />
    </div>
  )
}
