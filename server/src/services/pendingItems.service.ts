import { prisma } from '../lib/prisma.js'
import { computeReceivableStatus } from './receivable.service.js'
import { computePayrollStatus } from './payrollPayment.service.js'
import { computeInstallmentStatus } from './debt.service.js'
import type { PayrollObligationStatus, InstallmentStatus } from '@prisma/client'

export type PendingItemSourceType = 'RECEIVABLE' | 'PAYROLL' | 'RECURRING_EXPENSE' | 'DEBT'

export interface PendingItem {
  id:           string
  sourceType:   PendingItemSourceType
  title:        string
  description:  string
  amount:       number
  amountPaid:   number
  pendingAmount: number
  dueDate:      Date
  status:       string
  workspaceId:  string
}

interface PendingItemsFilter {
  workspaceId: string
  limit?:      number
  types?:      PendingItemSourceType[]
  includeDebt?: boolean
}

export const pendingItemsService = {
  async getAll({ workspaceId, limit, types }: PendingItemsFilter): Promise<PendingItem[]> {
    const includeAll = !types || types.length === 0
    const items: PendingItem[] = []

    // ── Receivables ───────────────────────────────────────────────────────────
    if (includeAll || types?.includes('RECEIVABLE')) {
      const receivables = await prisma.receivable.findMany({
        where:   { workspaceId, status: { notIn: ['PAID', 'CANCELLED'] } },
        include: { client: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take:    limit ? limit * 3 : undefined,
      })
      for (const r of receivables) {
        const status = computeReceivableStatus(r.status, r.dueDate, r.amountPaid, r.amount)
        items.push({
          id:            r.id,
          sourceType:    'RECEIVABLE',
          title:         r.client.name,
          description:   r.description,
          amount:        Number(r.amount),
          amountPaid:    Number(r.amountPaid),
          pendingAmount: Number(r.amount) - Number(r.amountPaid),
          dueDate:       r.dueDate,
          status,
          workspaceId:   r.workspaceId,
        })
      }
    }

    // ── PayrollObligations ────────────────────────────────────────────────────
    if (includeAll || types?.includes('PAYROLL')) {
      const obligations = await prisma.payrollObligation.findMany({
        where:   { workspaceId, status: { notIn: ['PAID', 'CANCELLED'] } },
        include: { employee: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take:    limit ? limit * 3 : undefined,
      })
      for (const o of obligations) {
        const status = computePayrollStatus(
          o.status as PayrollObligationStatus, o.dueDate, o.amountPaid, o.amount
        )
        items.push({
          id:            o.id,
          sourceType:    'PAYROLL',
          title:         o.employee.name,
          description:   o.description,
          amount:        Number(o.amount),
          amountPaid:    Number(o.amountPaid),
          pendingAmount: Number(o.amount) - Number(o.amountPaid),
          dueDate:       o.dueDate,
          status,
          workspaceId:   o.workspaceId,
        })
      }
    }

    // ── RecurringExpenseObligations ───────────────────────────────────────────
    if (includeAll || types?.includes('RECURRING_EXPENSE')) {
      const recObligations = await prisma.recurringExpenseObligation.findMany({
        where:   { workspaceId, status: { notIn: ['PAID', 'CANCELLED'] } },
        include: { recurringExpense: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take:    limit ? limit * 3 : undefined,
      })
      for (const r of recObligations) {
        const status = computePayrollStatus(
          r.status as PayrollObligationStatus, r.dueDate, r.amount, r.amount
        )
        items.push({
          id:            r.id,
          sourceType:    'RECURRING_EXPENSE',
          title:         r.recurringExpense.name,
          description:   `Gasto fijo — ${r.periodMonth}/${r.periodYear}`,
          amount:        Number(r.amount),
          amountPaid:    r.transactionId ? Number(r.amount) : 0,
          pendingAmount: r.transactionId ? 0 : Number(r.amount),
          dueDate:       r.dueDate,
          status:        r.transactionId ? 'PAID' : status,
          workspaceId:   r.workspaceId,
        })
      }
    }

    // ── DebtInstallments ──────────────────────────────────────────────────────
    if (includeAll || types?.includes('DEBT')) {
      const installments = await prisma.debtInstallment.findMany({
        where: {
          workspaceId,
          status: { notIn: ['PAID', 'CANCELLED'] },
          debt:   { status: { notIn: ['PAID', 'CANCELLED'] } },
        },
        include: { debt: { select: { name: true, type: true } } },
        orderBy: { dueDate: 'asc' },
        take:    limit ? limit * 3 : undefined,
      })
      for (const inst of installments) {
        const status = computeInstallmentStatus(
          inst.status as InstallmentStatus, inst.dueDate, inst.amountPaid, inst.amount
        )
        items.push({
          id:            inst.id,
          sourceType:    'DEBT',
          title:         inst.debt.name,
          description:   `Cuota ${inst.number} — ${inst.debt.type}`,
          amount:        Number(inst.amount),
          amountPaid:    Number(inst.amountPaid),
          pendingAmount: Number(inst.amount) - Number(inst.amountPaid),
          dueDate:       inst.dueDate,
          status,
          workspaceId,
        })
      }
    }

    // ── Sort: OVERDUE first, then by dueDate ─────────────────────────────────
    const sorted = items
      .filter(i => i.workspaceId === workspaceId)
      .sort((a, b) => {
        if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1
        if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })

    return limit ? sorted.slice(0, limit) : sorted
  },
}
