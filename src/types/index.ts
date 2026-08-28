import type { LucideIcon } from 'lucide-react'

// ─── Navigation ───────────────────────────────────────────────────────────────
export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  badge?: string | number
}

export interface NavGroup {
  title?: string
  items: NavItem[]
}

// ─── Workspace ────────────────────────────────────────────────────────────────
export type WorkspaceType = 'personal' | 'business'

export interface Workspace {
  id: string
  name: string
  type: WorkspaceType
  emoji?: string
}

// ─── KPI Metrics ──────────────────────────────────────────────────────────────
export type TrendDirection = 'up' | 'down' | 'neutral'
export type ColorVariant = 'default' | 'success' | 'danger' | 'warning' | 'info'

export interface KpiMetric {
  id: string
  label: string
  value: string
  icon: LucideIcon
  trend?: TrendDirection
  trendValue?: string
  trendLabel?: string
  subtitle?: string
  colorVariant?: ColorVariant
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  description: string
  category: string
  amount: number
  date: string
  type: TransactionType
  workspaceId: string
}

// ─── Upcoming Payments ────────────────────────────────────────────────────────
export interface UpcomingPayment {
  id: string
  name: string
  category: string
  amount: number
  dueDate: string
  paid: boolean
  workspaceId: string
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export type AccountType = 'bank' | 'digital' | 'cash' | 'crypto'

export interface Account {
  id: string
  name: string
  balance: number
  type: AccountType
  workspaceId: string
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export type ClientPaymentStatus = 'overdue' | 'pending' | 'partial' | 'paid'

export interface PendingClient {
  id: string
  name: string
  amount: number
  dueDate: string
  status: ClientPaymentStatus
}

// ─── Cash Flow ────────────────────────────────────────────────────────────────
export interface CashFlowData {
  month: string
  income: number
  expenses: number
}

// ─── Expense Categories ───────────────────────────────────────────────────────
export interface ExpenseCategory {
  name: string
  value: number
  color: string
}

// ─── Business Summary ─────────────────────────────────────────────────────────
export type SummaryRowType = 'income' | 'expense' | 'total' | 'neutral'

export interface BusinessSummaryRow {
  label: string
  value: string
  rawValue: number
  type: SummaryRowType
}

// ─── Date Range ───────────────────────────────────────────────────────────────
export interface DateRange {
  from: Date
  to: Date
}
