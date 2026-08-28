import { supabase } from '@/lib/supabase'
import type {
  ApiEmployee, ApiPayrollRule, ApiPayrollObligation, ApiPayrollPayment,
  CreateEmployeeInput, CreatePayrollRuleInput,
  EmployeeStatus, PayrollRuleStatus, PayrollObligationStatus, RecurringFrequency,
} from '@/types/api'

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapEmployee(row: Record<string, unknown>): ApiEmployee {
  const rules = (row.payroll_rules as Record<string, unknown>[] | null) ?? []
  return {
    id:           row.id as string,
    workspaceId:  row.workspace_id as string,
    name:         row.name as string,
    email:        row.email as string | null,
    phone:        row.phone as string | null,
    role:         row.role_name as string | null,
    status:       row.status as EmployeeStatus,
    notes:        row.notes as string | null,
    createdAt:    row.created_at as string,
    updatedAt:    row.updated_at as string,
    payrollRules: rules.map(mapPayrollRule),
  }
}

function mapPayrollRule(row: Record<string, unknown>): ApiPayrollRule {
  return {
    id:               row.id as string,
    employeeId:       row.employee_id as string,
    workspaceId:      row.workspace_id as string,
    amount:           row.amount as string,
    currency:         (row.currency as string ?? 'USD') as ApiPayrollRule['currency'],
    frequency:        row.frequency as RecurringFrequency,
    paymentDay:       row.payment_day as number,
    secondPaymentDay: row.second_payment_day as number | null,
    startDate:        row.start_date as string,
    endDate:          row.end_date as string | null,
    status:           row.status as PayrollRuleStatus,
    notes:            row.notes as string | null,
  }
}

function mapObligation(row: Record<string, unknown>): ApiPayrollObligation {
  const emp  = row.employees as Record<string, unknown> | null
  const rule = row.payroll_rules as Record<string, unknown> | null
  const pmts = (row.payments as Record<string, unknown>[] | null) ?? []

  const status  = row.status as PayrollObligationStatus
  const dueDate = row.due_date as string
  const isOverdue = (status === 'PENDING' || status === 'PARTIAL') && dueDate < new Date().toISOString().slice(0, 10)

  return {
    id:            row.id as string,
    workspaceId:   row.workspace_id as string,
    employeeId:    row.employee_id as string,
    payrollRuleId: row.payroll_rule_id as string,
    description:   row.description as string,
    amount:        row.amount as string,
    amountPaid:    row.amount_paid as string,
    dueDate,
    status:        isOverdue ? 'OVERDUE' : status,
    periodMonth:   row.period_month as number | null,
    periodYear:    row.period_year as number | null,
    notes:         row.notes as string | null,
    employee:      { id: emp?.id as string ?? row.employee_id as string, name: emp?.name as string ?? '' },
    payrollRule:   rule ? { id: rule.id as string, paymentDay: rule.payment_day as number } : null,
    payments:      pmts.map(p => ({ id: p.id as string, amount: p.amount as string, paymentDate: p.payment_date as string })),
  }
}

function mapPayment(row: Record<string, unknown>): ApiPayrollPayment {
  const acct = row.accounts     as Record<string, unknown> | null
  const obl  = row.payroll_obligations as Record<string, unknown> | null
  return {
    id:                  row.id as string,
    workspaceId:         row.workspace_id as string,
    employeeId:          row.employee_id as string,
    payrollObligationId: row.payroll_obligation_id as string,
    accountId:           row.account_id as string,
    amount:              row.amount as string,
    paymentDate:         row.payment_date as string,
    reference:           row.reference as string | null,
    notes:               row.notes as string | null,
    transactionId:       row.transaction_id as string | null,
    cancelled:           row.cancelled as boolean,
    account:             { id: acct?.id as string ?? '', name: acct?.name as string ?? '' },
    payrollObligation:   { id: obl?.id as string ?? '', description: obl?.description as string ?? '' },
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────
const EMP_JOIN = `*, payroll_rules(*)`
const OBL_JOIN = `*, employees:employee_id(id, name), payroll_rules:payroll_rule_id(id, payment_day), payments:payroll_payments(id, amount, payment_date)`
const PAY_JOIN = `*, accounts:account_id(id, name), payroll_obligations:payroll_obligation_id(id, description)`

export const employeesService = {
  async list(workspaceId: string): Promise<ApiEmployee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select(EMP_JOIN)
      .eq('workspace_id', workspaceId)
      .order('name')
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapEmployee)
  },

  async get(id: string, workspaceId: string): Promise<ApiEmployee> {
    const { data, error } = await supabase
      .from('employees')
      .select(EMP_JOIN)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()
    if (error) throw new Error(error.message)
    return mapEmployee(data as unknown as Record<string, unknown>)
  },

  async create(input: CreateEmployeeInput): Promise<ApiEmployee> {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        workspace_id: input.workspaceId,
        name:         input.name,
        email:        input.email ?? null,
        phone:        input.phone ?? null,
        role_name:    input.role  ?? null,
        notes:        input.notes ?? null,
      })
      .select(EMP_JOIN)
      .single()
    if (error) throw new Error(error.message)
    return mapEmployee(data as unknown as Record<string, unknown>)
  },

  async update(id: string, _workspaceId: string, data: Partial<CreateEmployeeInput> & { status?: string }): Promise<ApiEmployee> {
    const patch: Record<string, unknown> = {}
    if (data.name   !== undefined) patch.name      = data.name
    if (data.email  !== undefined) patch.email     = data.email
    if (data.phone  !== undefined) patch.phone     = data.phone
    if (data.role   !== undefined) patch.role_name = data.role
    if (data.notes  !== undefined) patch.notes     = data.notes
    if (data.status !== undefined) patch.status    = data.status

    const { data: updated, error } = await supabase
      .from('employees')
      .update(patch)
      .eq('id', id)
      .select(EMP_JOIN)
      .single()
    if (error) throw new Error(error.message)
    return mapEmployee(updated as unknown as Record<string, unknown>)
  },

  async addPayrollRule(employeeId: string, workspaceId: string, input: CreatePayrollRuleInput): Promise<unknown> {
    const { data, error } = await supabase
      .from('payroll_rules')
      .insert({
        workspace_id:      workspaceId,
        employee_id:       employeeId,
        amount:            String(input.amount),
        currency:          input.currency        ?? 'USD',
        frequency:         input.frequency       ?? 'MONTHLY',
        payment_day:       input.paymentDay,
        second_payment_day: input.secondPaymentDay ?? null,
        start_date:        input.startDate,
        notes:             input.notes ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async listObligations(employeeId: string, _workspaceId: string): Promise<ApiPayrollObligation[]> {
    const { data, error } = await supabase
      .from('payroll_obligations')
      .select(OBL_JOIN)
      .eq('employee_id', employeeId)
      .order('due_date', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapObligation)
  },

  async listPayments(employeeId: string, _workspaceId: string): Promise<ApiPayrollPayment[]> {
    const { data, error } = await supabase
      .from('payroll_payments')
      .select(PAY_JOIN)
      .eq('employee_id', employeeId)
      .eq('cancelled', false)
      .order('payment_date', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapPayment)
  },
}
