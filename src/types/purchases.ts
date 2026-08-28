export type PurchaseStatus   = 'TODO' | 'PLANNED' | 'PURCHASED' | 'CANCELLED'
export type PurchasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ReminderStatus   = 'PENDING' | 'COMPLETED' | 'DISMISSED'
export type ReminderSource   =
  | 'PURCHASE' | 'PAYROLL' | 'RECEIVABLE' | 'DEBT'
  | 'CASHEA' | 'SAN' | 'RECURRING_EXPENSE' | 'MANUAL'

export const PURCHASE_CATEGORIES = [
  'Familia', 'Hogar', 'Vehículo', 'Personal', 'Tecnología',
  'Trabajo', 'Fernando ADS', 'Lanz Technology', 'Salud', 'Regalos', 'Otros',
] as const

export type PurchaseCategory = typeof PURCHASE_CATEGORIES[number]

export interface PurchaseItem {
  id:              string
  workspaceId?:    string
  title:           string
  description?:    string
  category:        PurchaseCategory
  estimatedAmount?: number
  currency:        'USD' | 'VES' | 'EUR'
  priority:        PurchasePriority
  status:          PurchaseStatus
  dueDate?:        string   // ISO date
  reminderDate?:   string   // ISO date
  isRecurring:     boolean
  notes?:          string
  createdAt:       string
  updatedAt:       string
  completedAt?:    string
  transactionId?:  string  // set when converted to expense
  plannedMonth?:   string  // 'YYYY-MM' — planned for a specific month
}

export interface Reminder {
  id:           string
  workspaceId?: string
  title:        string
  description?: string
  sourceType:   ReminderSource
  sourceId?:    string
  reminderDate: string   // ISO date
  priority:     PurchasePriority
  status:       ReminderStatus
  createdAt:    string
  updatedAt:    string
  completedAt?: string
  snoozedTo?:   string  // ISO date when snoozed
}

export const PRIORITY_CLS: Record<PurchasePriority, string> = {
  LOW:    'bg-base-elevated text-content-disabled border-base-border',
  MEDIUM: 'bg-brand-600/10 text-brand-400 border-brand-600/20',
  HIGH:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  URGENT: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export const PRIORITY_LABEL: Record<PurchasePriority, string> = {
  LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente',
}

export const STATUS_LABEL: Record<PurchaseStatus, string> = {
  TODO: 'Pendiente', PLANNED: 'Planificada', PURCHASED: 'Comprada', CANCELLED: 'Cancelada',
}
