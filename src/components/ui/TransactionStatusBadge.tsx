import { Badge } from './Badge'
import type { TransactionStatus } from '@/types/api'

const STATUS_MAP: Record<TransactionStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  COMPLETED: { label: 'Completado', variant: 'success' },
  PENDING:   { label: 'Pendiente',  variant: 'warning' },
  CANCELLED: { label: 'Anulado',    variant: 'danger'  },
}

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const { label, variant } = STATUS_MAP[status]
  return <Badge variant={variant}>{label}</Badge>
}
