import { Wallet } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui'

export function FinancesPage() {
  return (
    <div>
      <PageHeader title="Finanzas Personales" description="Gestión de tus finanzas personales" />
      <EmptyState icon={Wallet} title="Finanzas Personales" description="Aquí podrás gestionar tus finanzas personales." />
    </div>
  )
}
