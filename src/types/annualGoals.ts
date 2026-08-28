export type AnnualGoalCategory =
  | 'PERSONAL' | 'FAMILY' | 'FINANCIAL' | 'BUSINESS'
  | 'HEALTH' | 'EDUCATION' | 'PURCHASE' | 'TRAVEL' | 'PROJECT' | 'OTHER'

export type AnnualGoalStatus =
  | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'

export type AnnualGoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AnnualGoalProgressMode = 'MANUAL' | 'MILESTONES'

export type MilestoneStatus = 'PENDING' | 'COMPLETED'

export interface AnnualGoal {
  id:                   string
  workspaceId:          string
  title:                string
  description:          string | null
  year:                 number
  category:             AnnualGoalCategory
  priority:             AnnualGoalPriority
  status:               AnnualGoalStatus
  progress:             number
  progressMode:         AnnualGoalProgressMode
  isFocus:              boolean
  targetDate:           string | null
  startedAt:            string | null
  completedAt:          string | null
  progressUpdatedAt:    string | null
  financialGoalId:      string | null
  purchaseItemId:       string | null
  carryOverFromGoalId:  string | null
  notes:                string | null
  createdBy:            string | null
  createdAt:            string
  updatedAt:            string
}

export interface AnnualGoalMilestone {
  id:          string
  workspaceId: string
  goalId:      string
  title:       string
  description: string | null
  status:      MilestoneStatus
  targetDate:  string | null
  completedAt: string | null
  sortOrder:   number
  createdAt:   string
  updatedAt:   string
}

export interface AnnualGoalSummary {
  total:       number
  completed:   number
  in_progress: number
  not_started: number
  paused:      number
  cancelled:   number
  overdue:     number
  due_soon:    number
}

export const CATEGORY_LABEL: Record<AnnualGoalCategory, string> = {
  PERSONAL:  'Personal',
  FAMILY:    'Familia',
  FINANCIAL: 'Finanzas',
  BUSINESS:  'Negocios',
  HEALTH:    'Salud',
  EDUCATION: 'Formación',
  PURCHASE:  'Compras',
  TRAVEL:    'Viajes',
  PROJECT:   'Proyectos',
  OTHER:     'Otros',
}

export const STATUS_LABEL: Record<AnnualGoalStatus, string> = {
  NOT_STARTED: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED:   'Completada',
  PAUSED:      'Pausada',
  CANCELLED:   'Cancelada',
}

export const PRIORITY_LABEL: Record<AnnualGoalPriority, string> = {
  LOW:      'Baja',
  MEDIUM:   'Media',
  HIGH:     'Alta',
  CRITICAL: 'Prioridad',
}
