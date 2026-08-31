// Tipos que representan respuestas de la API (no los mocks)

export type WorkspaceType = 'PERSONAL' | 'BUSINESS'
export type AccountType = 'BANK' | 'CASH' | 'ZELLE' | 'CRYPTO' | 'CREDIT_CARD' | 'OTHER'
export type Currency = 'USD' | 'VES' | 'EUR'
export type CategoryType = 'INCOME' | 'EXPENSE'
export type TransactionType = 'INCOME' | 'EXPENSE'
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

export interface ApiWorkspace {
  id: string
  name: string
  slug: string
  type: WorkspaceType
  emoji: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiAccount {
  id: string
  workspaceId: string
  name: string
  type: AccountType
  currency: Currency
  initialBalance: string
  currentBalance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiCategory {
  id: string
  workspaceId: string | null
  name: string
  type: CategoryType
  icon: string | null
  color: string | null
  isActive: boolean
}

export interface ApiTransactionCategory {
  id: string
  name: string
  type: CategoryType
  color: string | null
  icon: string | null
}

export interface ApiTransactionAccount {
  id: string
  name: string
  type: AccountType
}

export interface ApiTransaction {
  id: string
  workspaceId: string
  accountId: string
  categoryId: string
  type: TransactionType
  amount: string
  description: string
  transactionDate: string
  status: TransactionStatus
  notes: string | null
  reference: string | null
  createdAt: string
  updatedAt: string
  account: ApiTransactionAccount
  category: ApiTransactionCategory
}

export interface DashboardSummary {
  income:    { total: number; count: number }
  expenses:  { total: number; count: number }
  balance:   number
  pending:   { total: number; count: number }
  available: number
  committed: number
  projection: number
}

export interface CashFlowPoint {
  month: string
  income: number
  expenses: number
}

export interface ExpenseDistributionItem {
  name: string
  value: number
  color: string
  percentage: number
}

export interface CreateTransactionInput {
  workspaceId: string
  accountId: string
  categoryId: string
  type: TransactionType
  amount: number
  description: string
  transactionDate: string
  status?: TransactionStatus
  notes?: string
  reference?: string
}

export interface UpdateTransactionInput {
  accountId?: string
  categoryId?: string
  amount?: number
  description?: string
  transactionDate?: string
  status?: TransactionStatus
  notes?: string | null
  reference?: string | null
}

export interface CreateAccountInput {
  workspaceId: string
  name: string
  type: AccountType
  currency?: Currency
  initialBalance?: number
}

// ─── Clients / CRM ────────────────────────────────────────────────────────────

export type ClientStatus         = 'ACTIVE' | 'PAUSED' | 'INACTIVE'
export type BillingFrequency     = 'MONTHLY' | 'ONE_TIME' | 'CUSTOM'
export type ClientServiceStatus  = 'ACTIVE' | 'PAUSED' | 'CANCELLED'
export type ReceivableStatus     = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface ApiService {
  id: string
  workspaceId: string
  name: string
  description: string | null
  isActive: boolean
}

export interface ApiClientService {
  id: string
  clientId: string
  serviceId: string
  price: string
  billingFrequency: BillingFrequency
  billingDay: number
  startDate: string
  endDate: string | null
  status: ClientServiceStatus
  notes: string | null
  service: { id: string; name: string; description: string | null }
}

export interface ApiClient {
  id: string
  workspaceId: string
  name: string
  companyName: string | null
  email: string | null
  phone: string | null
  status: ClientStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  clientServices: ApiClientService[]
}

export interface ApiReceivable {
  id: string
  workspaceId: string
  clientId: string
  clientServiceId: string | null
  description: string
  amount: string
  amountPaid: string
  dueDate: string
  status: ReceivableStatus    // incluye OVERDUE computado por el backend
  periodMonth: number | null
  periodYear: number | null
  notes: string | null
  createdAt: string
  client: { id: string; name: string; companyName: string | null }
  clientService: { id: string; service: { id: string; name: string } } | null
  payments: { id: string; amount: string; paymentDate: string; reference: string | null }[]
}

export interface ApiClientPayment {
  id: string
  workspaceId: string
  clientId: string
  receivableId: string
  accountId: string
  amount: string
  paymentDate: string
  reference: string | null
  notes: string | null
  transactionId: string | null
  account: { id: string; name: string }
  receivable: { id: string; description: string }
}

export interface BusinessDashboardData {
  billed:           number
  collected:        number
  pending:          number
  expenses:         number
  operatingProfit:  number
  billedCount:      number
  collectedCount:   number
}

export interface ClientProfitability {
  collected:    number
  directCosts:  number
  margin:       number
  marginPct:    number
}

export interface RegisterPaymentInput {
  workspaceId:     string
  clientId:        string
  accountId:       string
  amount:          number
  paymentDate:     string
  reference?:      string
  notes?:          string
  idempotencyKey?: string
}

export interface CreateClientInput {
  workspaceId:  string
  name:         string
  companyName?: string
  email?:       string
  phone?:       string
  notes?:       string
}

export interface CreateClientServiceInput {
  serviceId:        string
  price:            number
  billingFrequency?: BillingFrequency
  billingDay:       number
  startDate:        string
  endDate?:         string
  notes?:           string
}

// ─── Payroll / Team (Hito 5) ─────────────────────────────────────────────────

export type EmployeeStatus        = 'ACTIVE' | 'PAUSED' | 'INACTIVE'
export type PayrollRuleStatus     = 'ACTIVE' | 'PAUSED' | 'CANCELLED'
export type RecurringFrequency    = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ONE_TIME' | 'CUSTOM'
export type PayrollObligationStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface ApiPayrollRule {
  id:               string
  employeeId:       string
  workspaceId:      string
  amount:           string
  currency:         Currency
  frequency:        RecurringFrequency
  paymentDay:       number
  secondPaymentDay: number | null
  startDate:        string
  endDate:          string | null
  status:           PayrollRuleStatus
  notes:            string | null
}

export interface ApiEmployee {
  id:          string
  workspaceId: string
  name:        string
  email:       string | null
  phone:       string | null
  role:        string | null
  status:      EmployeeStatus
  notes:       string | null
  createdAt:   string
  updatedAt:   string
  payrollRules: ApiPayrollRule[]
}

export interface ApiPayrollObligation {
  id:            string
  workspaceId:   string
  employeeId:    string
  payrollRuleId: string
  description:   string
  amount:        string
  amountPaid:    string
  dueDate:       string
  status:        PayrollObligationStatus
  periodMonth:   number | null
  periodYear:    number | null
  notes:         string | null
  employee:      { id: string; name: string }
  payrollRule:   { id: string; paymentDay: number } | null
  payments:      { id: string; amount: string; paymentDate: string }[]
}

export interface ApiPayrollPayment {
  id:                  string
  workspaceId:         string
  employeeId:          string
  payrollObligationId: string
  accountId:           string
  amount:              string
  paymentDate:         string
  reference:           string | null
  notes:               string | null
  transactionId:       string | null
  cancelled:           boolean
  account:             { id: string; name: string }
  payrollObligation:   { id: string; description: string }
}

export interface ApiRecurringExpense {
  id:          string
  workspaceId: string
  name:        string
  amount:      string
  categoryId:  string
  frequency:   RecurringFrequency
  paymentDay:  number
  accountId:   string | null
  startDate:   string
  endDate:     string | null
  isActive:    boolean
  notes:       string | null
  category:    { id: string; name: string; color: string | null }
  account:     { id: string; name: string } | null
}

export interface ApiRecurringExpenseObligation {
  id:                 string
  workspaceId:        string
  recurringExpenseId: string
  amount:             string
  dueDate:            string
  periodMonth:        number
  periodYear:         number
  status:             PayrollObligationStatus
  transactionId:      string | null
  recurringExpense:   { id: string; name: string }
}

export interface PayrollSummary {
  expected:    number
  paid:        number
  outstanding: number
  overdue:     number
}

export type PendingItemSourceType = 'RECEIVABLE' | 'PAYROLL' | 'RECURRING_EXPENSE' | 'DEBT'

export interface PendingItem {
  id:            string
  sourceType:    PendingItemSourceType
  title:         string
  description:   string
  amount:        number
  amountPaid:    number
  pendingAmount: number
  dueDate:       string
  status:        string
  workspaceId:   string
  entityId:      string
  direction:     'INCOMING' | 'OUTGOING'
}

export interface RegisterPayrollPaymentInput {
  workspaceId:        string
  employeeId:         string
  accountId:          string
  amount:             number
  paymentDate:        string
  reference?:         string
  notes?:             string
  idempotencyKey?:    string
}

export interface CreateEmployeeInput {
  workspaceId: string
  name:        string
  email?:      string
  phone?:      string
  role?:       string
  notes?:      string
}

export interface CreatePayrollRuleInput {
  amount:           number
  currency?:        Currency
  frequency?:       RecurringFrequency
  paymentDay:       number
  secondPaymentDay?: number
  startDate:        string
  notes?:           string
}

export interface CreateRecurringExpenseInput {
  workspaceId: string
  name:        string
  amount:      number
  categoryId:  string
  frequency?:  RecurringFrequency
  paymentDay:  number
  accountId?:  string
  startDate:   string
  notes?:      string
}

// ─── Debts / Compromisos Financieros (Hito 6) ────────────────────────────────

export type DebtType   = 'CASHEA' | 'SAN' | 'LOAN' | 'CREDIT_CARD' | 'INSTALLMENT' | 'PERSONAL' | 'OTHER'
export type DebtStatus = 'ACTIVE' | 'PAID' | 'PAUSED' | 'CANCELLED' | 'DEFAULTED'
export type InstallmentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface ApiDebtInstallment {
  id:          string
  debtId:      string
  workspaceId: string
  number:      number
  amount:      string
  amountPaid:  string
  dueDate:     string
  status:      InstallmentStatus
  notes:       string | null
  payments:    { id: string; amount: string; paymentDate: string; reference: string | null }[]
}

export interface DebtSummary {
  totalAmount:      number
  totalPaid:        number
  outstanding:      number
  paidCount:        number
  pendingCount:     number
  completionPct:    number
  nextInstallment:  ApiDebtInstallment | null
}

export interface ApiDebt {
  id:             string
  workspaceId:    string
  name:           string
  provider:       string | null
  description:    string | null
  type:           DebtType
  originalAmount: string
  downPayment:    string
  financedAmount: string
  installments:   number
  monthlyAmount:  string
  startDate:      string
  endDate:        string | null
  status:         DebtStatus
  notes:          string | null
  createdAt:      string
  updatedAt:      string
  debtInstallments: ApiDebtInstallment[]
  payments?:      ApiDebtPayment[]
  summary:        DebtSummary
}

export interface ApiDebtPayment {
  id:            string
  workspaceId:   string
  debtId:        string
  installmentId: string
  accountId:     string
  amount:        string
  paymentDate:   string
  reference:     string | null
  notes:         string | null
  transactionId: string | null
  cancelled:     boolean
  account:       { id: string; name: string }
  installment:   { id: string; number: number }
}

export interface FinancialCommitmentSummary {
  totalBalance:        number
  totalDebt:           number
  payrollCommitment:   number
  recurringCommitment: number
  currentInstallments: number
  monthlyCommitted:    number
  realAvailable:       number
}

export interface CreateDebtInput {
  workspaceId:    string
  name:           string
  provider?:      string
  description?:   string
  type:           DebtType
  originalAmount: number
  downPayment?:   number
  financedAmount: number
  installments:   number
  monthlyAmount:  number
  startDate:      string
  notes?:         string
}

export interface RegisterDebtPaymentInput {
  workspaceId:     string
  debtId:          string
  installmentId:   string
  accountId:       string
  amount:          number
  paymentDate:     string
  reference?:      string
  notes?:          string
  idempotencyKey?: string
}
