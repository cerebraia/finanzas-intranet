import { Tag } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui'

export function CategoriesPage() {
  return (
    <div>
      <PageHeader title="Categorías" description="Gestión de categorías de transacciones" />
      <EmptyState icon={Tag} title="Categorías" description="Aquí podrás gestionar las categorías de tus transacciones." />
    </div>
  )
}
