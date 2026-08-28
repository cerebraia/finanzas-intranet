import { supabase } from '@/lib/supabase'
import type { ApiPayrollObligation, PayrollSummary, RegisterPayrollPaymentInput, PayrollObligationStatus } from '@/types/api'

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

const OBL_JOIN = `*, employees:employee_id(id, name), payroll_rules:payroll_rule_id(id, payment_day), payments:payroll_payments(id, amount, payment_date)`

export const payrollService = {
  async listObligations(workspaceId: string, params?: { from?: string; to?: string; status?: string; employeeId?: string }): Promise<ApiPayrollObligation[]> {
    let query = supabase
      .from('payroll_obligations')
      .select(OBL_JOIN)
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: false })

    if (params?.employeeId) query = query.eq('employee_id', params.employeeId)
    if (params?.from)       query = query.gte('due_date', params.from)
    if (params?.to)         query = query.lte('due_date', params.to)
    if (params?.status && params.status !== 'OVERDUE') {
      query = query.eq('status', params.status)
    } else if (params?.status === 'OVERDUE') {
      query = query.in('status', ['PENDING','PARTIAL']).lt('due_date', new Date().toISOString().slice(0, 10))
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapObligation)
  },

  async registerPayment(
    obligationId: string,
    data: RegisterPayrollPaymentInput
  ): Promise<{ payment: unknown; obligation: ApiPayrollObligation; transaction: unknown }> {
    const { data: result, error } = await supabase.rpc('register_payroll_payment', {
      p_workspace_id:    data.workspaceId,
      p_employee_id:     data.employeeId,
      p_obligation_id:   obligationId,
      p_account_id:      data.accountId,
      p_amount:          data.amount,
      p_currency:        'USD',
      p_payment_date:    data.paymentDate,
      p_reference:       data.reference       ?? null,
      p_notes:           data.notes           ?? null,
      p_idempotency_key: data.idempotencyKey  ?? null,
    })
    if (error) throw new Error(error.message)
    const r = result as Record<string, unknown>
    return {
      payment:    { id: r.payment_id },
      obligation: { id: obligationId, status: r.obligation_status } as unknown as ApiPayrollObligation,
      transaction: { id: r.transaction_id },
    }
  },

  async cancelPayment(paymentId: string, workspaceId: string): Promise<{ cancelled: boolean }> {
    const { data, error } = await supabase.rpc('cancel_payroll_payment', {
      p_workspace_id: workspaceId,
      p_payment_id:   paymentId,
    })
    if (error) throw new Error(error.message)
    return data as { cancelled: boolean }
  },

  async generate(workspaceId: string, month: number, year: number): Promise<{ created: string[]; skipped: string[] }> {
    const { data, error } = await supabase.rpc('generate_payroll_obligations', {
      p_workspace_id: workspaceId,
      p_month:        month,
      p_year:         year,
    })
    if (error) throw new Error(error.message)
    const r = data as Record<string, number>
    return { created: Array(r.created ?? 0).fill(''), skipped: Array(r.skipped ?? 0).fill('') }
  },

  async summary(workspaceId: string, from: string, to: string): Promise<PayrollSummary> {
    const { data, error } = await supabase
      .from('payroll_obligations')
      .select('amount, amount_paid, status, due_date')
      .eq('workspace_id', workspaceId)
      .gte('due_date', from)
      .lte('due_date', to)

    if (error) throw new Error(error.message)

    const rows = (data ?? []) as { amount: string; amount_paid: string; status: string; due_date: string }[]
    const today = new Date().toISOString().slice(0, 10)

    let expected = 0, paid = 0, outstanding = 0, overdue = 0

    for (const r of rows) {
      const amt      = parseFloat(r.amount)
      const amtPaid  = parseFloat(r.amount_paid)
      const isOverdue = (r.status === 'PENDING' || r.status === 'PARTIAL') && r.due_date < today

      expected += amt
      paid     += amtPaid
      if (r.status !== 'PAID' && r.status !== 'CANCELLED') outstanding += amt - amtPaid
      if (isOverdue) overdue += amt - amtPaid
    }

    return { expected, paid, outstanding, overdue }
  },
}
