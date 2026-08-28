import { supabase } from '@/lib/supabase'
import type {
  ApiDebt, ApiDebtInstallment, ApiDebtPayment,
  CreateDebtInput, RegisterDebtPaymentInput, FinancialCommitmentSummary,
  DebtType, DebtStatus, InstallmentStatus,
} from '@/types/api'

// ─── Row mappers ─────────────────────────────────────────────────────────────
function mapInstallment(row: Record<string, unknown>): ApiDebtInstallment {
  const pmts = (row.payments as Record<string, unknown>[] | null) ?? []
  const status = row.status as InstallmentStatus
  const dueDate = row.due_date as string
  const isOverdue = status === 'PENDING' || status === 'PARTIAL'
    ? dueDate < new Date().toISOString().slice(0, 10)
    : false

  return {
    id:          row.id as string,
    debtId:      row.debt_id as string,
    workspaceId: row.workspace_id as string,
    number:      row.installment_number as number,
    amount:      row.amount as string,
    amountPaid:  row.amount_paid as string,
    dueDate,
    status:      isOverdue ? 'OVERDUE' : status,
    notes:       row.notes as string | null,
    payments:    pmts.map(p => ({
      id:          p.id as string,
      amount:      p.amount as string,
      paymentDate: p.payment_date as string,
      reference:   p.reference as string | null,
    })),
  }
}

function mapDebt(row: Record<string, unknown>): ApiDebt {
  const installments = (row.debt_installments as Record<string, unknown>[] | null) ?? []
  const mappedInst   = installments.map(mapInstallment)

  const totalAmount   = parseFloat(row.financed_amount as string)
  const totalPaid     = mappedInst.reduce((s, i) => s + parseFloat(i.amountPaid), 0)
  const outstanding   = totalAmount - totalPaid
  const paidCount     = mappedInst.filter(i => i.status === 'PAID').length
  const pendingCount  = mappedInst.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').length
  const completionPct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0
  const nextInst      = mappedInst.find(i => i.status !== 'PAID' && i.status !== 'CANCELLED') ?? null

  return {
    id:             row.id as string,
    workspaceId:    row.workspace_id as string,
    name:           row.name as string,
    provider:       row.provider as string | null,
    description:    row.description as string | null,
    type:           row.type as DebtType,
    originalAmount: row.original_amount as string,
    downPayment:    row.down_payment as string,
    financedAmount: row.financed_amount as string,
    installments:   row.installments as number,
    monthlyAmount:  row.monthly_amount as string,
    startDate:      row.start_date as string,
    endDate:        row.end_date as string | null,
    status:         row.status as DebtStatus,
    notes:          row.notes as string | null,
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
    debtInstallments: mappedInst,
    summary: {
      totalAmount, totalPaid, outstanding, paidCount, pendingCount,
      completionPct, nextInstallment: nextInst,
    },
  }
}

function mapPayment(row: Record<string, unknown>): ApiDebtPayment {
  const acct = row.accounts     as Record<string, unknown> | null
  const inst = row.debt_installments as Record<string, unknown> | null
  return {
    id:            row.id as string,
    workspaceId:   row.workspace_id as string,
    debtId:        row.debt_id as string,
    installmentId: row.installment_id as string,
    accountId:     row.account_id as string,
    amount:        row.amount as string,
    paymentDate:   row.payment_date as string,
    reference:     row.reference as string | null,
    notes:         row.notes as string | null,
    transactionId: row.transaction_id as string | null,
    cancelled:     row.cancelled as boolean,
    account:  { id: acct?.id as string ?? '', name: acct?.name as string ?? '' },
    installment: { id: inst?.id as string ?? '', number: inst?.installment_number as number ?? 0 },
  }
}

const DEBT_JOIN = `
  *, debt_installments(
    *, payments:debt_payments(id, amount, payment_date, reference)
  )
`

export const debtsService = {
  async list(workspaceId: string, type?: string): Promise<ApiDebt[]> {
    let query = supabase
      .from('debts')
      .select(DEBT_JOIN)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (type) query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapDebt)
  },

  async get(id: string, workspaceId: string): Promise<ApiDebt> {
    const { data, error } = await supabase
      .from('debts')
      .select(DEBT_JOIN)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()
    if (error) throw new Error(error.message)
    return mapDebt(data as unknown as Record<string, unknown>)
  },

  async create(input: CreateDebtInput): Promise<ApiDebt> {
    const { data, error } = await supabase.rpc('create_debt_with_installments', {
      p_workspace_id:    input.workspaceId,
      p_name:            input.name,
      p_type:            input.type,
      p_original_amount: input.originalAmount,
      p_down_payment:    input.downPayment    ?? 0,
      p_financed_amount: input.financedAmount,
      p_installments:    input.installments,
      p_monthly_amount:  input.monthlyAmount,
      p_start_date:      input.startDate,
      p_currency:        'USD',
      p_provider:        input.provider     ?? null,
      p_description:     input.description  ?? null,
      p_san_direction:   null,
      p_notes:           input.notes        ?? null,
    })
    if (error) throw new Error(error.message)
    return debtsService.get(data as string, input.workspaceId)
  },

  async update(id: string, workspaceId: string, data: Partial<{ name: string; provider: string; status: string; notes: string }>): Promise<ApiDebt> {
    const patch: Record<string, unknown> = {}
    if (data.name     !== undefined) patch.name     = data.name
    if (data.provider !== undefined) patch.provider = data.provider
    if (data.status   !== undefined) patch.status   = data.status
    if (data.notes    !== undefined) patch.notes    = data.notes

    const { error } = await supabase.from('debts').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    return debtsService.get(id, workspaceId)
  },

  async listInstallments(debtId: string, _workspaceId: string): Promise<ApiDebtInstallment[]> {
    const { data, error } = await supabase
      .from('debt_installments')
      .select('*, payments:debt_payments(id, amount, payment_date, reference)')
      .eq('debt_id', debtId)
      .order('installment_number')
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapInstallment)
  },

  async registerPayment(
    installmentId: string,
    data: RegisterDebtPaymentInput
  ): Promise<{ payment: ApiDebtPayment; installment: ApiDebtInstallment; transaction: unknown }> {
    const { data: result, error } = await supabase.rpc('register_debt_payment', {
      p_workspace_id:    data.workspaceId,
      p_debt_id:         data.debtId,
      p_installment_id:  installmentId,
      p_account_id:      data.accountId,
      p_amount:          data.amount,
      p_currency:        'USD',
      p_payment_date:    data.paymentDate,
      p_reference:       data.reference      ?? null,
      p_notes:           data.notes          ?? null,
      p_idempotency_key: data.idempotencyKey ?? null,
    })
    if (error) throw new Error(error.message)
    const r = result as Record<string, unknown>
    return {
      payment:     { id: r.payment_id } as ApiDebtPayment,
      installment: { id: installmentId, status: r.installment_status } as unknown as ApiDebtInstallment,
      transaction: { id: r.transaction_id },
    }
  },

  async cancelPayment(paymentId: string, workspaceId: string): Promise<{ cancelled: boolean }> {
    const { data, error } = await supabase.rpc('cancel_debt_payment', {
      p_workspace_id: workspaceId,
      p_payment_id:   paymentId,
    })
    if (error) throw new Error(error.message)
    return data as { cancelled: boolean }
  },

  async commitmentSummary(workspaceId: string): Promise<FinancialCommitmentSummary> {
    const { data, error } = await supabase.rpc('get_commitment_summary', {
      p_workspace_id: workspaceId,
    })
    if (error) throw new Error(error.message)
    const r = data as Record<string, number>
    return {
      totalBalance:        r.totalBalance        ?? 0,
      totalDebt:           r.totalDebt           ?? 0,
      payrollCommitment:   r.payrollCommitment   ?? 0,
      recurringCommitment: r.recurringCommitment ?? 0,
      currentInstallments: r.currentInstallments ?? 0,
      monthlyCommitted:    r.monthlyCommitted     ?? 0,
      realAvailable:       r.realAvailable        ?? 0,
    }
  },

  // Compatibilidad con hook existente
  async generateInstallments(_debtId: string, _workspaceId: string) {
    return { created: [], skipped: [] }
  },

  async listPayments(debtId: string, _workspaceId: string): Promise<ApiDebtPayment[]> {
    const { data, error } = await supabase
      .from('debt_payments')
      .select('*, accounts:account_id(id, name), debt_installments:installment_id(id, installment_number)')
      .eq('debt_id', debtId)
      .eq('cancelled', false)
      .order('payment_date', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapPayment)
  },
}
