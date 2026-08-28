import { prisma } from '../lib/prisma.js'
import type { PayrollObligationStatus } from '@prisma/client'
import { computePayrollStatus } from './payrollPayment.service.js'

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const includeRelations = {
  category: { select: { id: true, name: true, color: true } },
  account:  { select: { id: true, name: true } },
}

export const recurringExpenseService = {
  async findAll(workspaceId: string) {
    return prisma.recurringExpense.findMany({
      where:   { workspaceId, isActive: true },
      include: includeRelations,
      orderBy: { name: 'asc' },
    })
  },

  async create(data: {
    workspaceId: string; name: string; amount: number; categoryId: string;
    frequency?: string; paymentDay: number; accountId?: string;
    startDate: string; notes?: string;
  }) {
    return prisma.recurringExpense.create({
      data: {
        workspaceId: data.workspaceId,
        name:        data.name,
        amount:      data.amount,
        categoryId:  data.categoryId,
        frequency:   (data.frequency ?? 'MONTHLY') as 'MONTHLY',
        paymentDay:  data.paymentDay,
        accountId:   data.accountId,
        startDate:   new Date(data.startDate),
        notes:       data.notes,
      },
      include: includeRelations,
    })
  },

  async update(id: string, workspaceId: string, data: Partial<{
    name: string; amount: number; categoryId: string; paymentDay: number;
    accountId: string | null; isActive: boolean; notes: string;
  }>) {
    await prisma.recurringExpense.findFirstOrThrow({ where: { id, workspaceId } })
    return prisma.recurringExpense.update({ where: { id }, data, include: includeRelations })
  },

  async generateMonthlyObligations(workspaceId: string, month: number, year: number) {
    const expenses = await prisma.recurringExpense.findMany({
      where: { workspaceId, isActive: true, frequency: 'MONTHLY' },
    })

    const created: string[] = []
    const skipped: string[] = []

    for (const exp of expenses) {
      const exists = await prisma.recurringExpenseObligation.findUnique({
        where: {
          recurringExpenseId_periodMonth_periodYear: {
            recurringExpenseId: exp.id,
            periodMonth:        month,
            periodYear:         year,
          },
        },
      })

      if (exists) { skipped.push(exp.name); continue }

      await prisma.recurringExpenseObligation.create({
        data: {
          workspaceId,
          recurringExpenseId: exp.id,
          amount:      exp.amount,
          dueDate:     new Date(year, month - 1, exp.paymentDay),
          periodMonth: month,
          periodYear:  year,
        },
      })
      created.push(exp.name)
    }

    return { created, skipped, month, year }
  },

  async pay(recurringExpenseId: string, workspaceId: string, data: {
    month: number; year: number; accountId: string; paymentDate: string; reference?: string;
  }) {
    const expense = await prisma.recurringExpense.findFirstOrThrow({ where: { id: recurringExpenseId, workspaceId } })
    const monthName = MONTH_NAMES[data.month - 1]

    let obligation = await prisma.recurringExpenseObligation.findUnique({
      where: {
        recurringExpenseId_periodMonth_periodYear: {
          recurringExpenseId,
          periodMonth: data.month,
          periodYear:  data.year,
        },
      },
    })

    if (!obligation) {
      obligation = await prisma.recurringExpenseObligation.create({
        data: {
          workspaceId,
          recurringExpenseId,
          amount:      expense.amount,
          dueDate:     new Date(data.year, data.month - 1, expense.paymentDay),
          periodMonth: data.month,
          periodYear:  data.year,
        },
      })
    }

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          workspaceId,
          accountId:       data.accountId,
          categoryId:      expense.categoryId,
          type:            'EXPENSE',
          status:          'COMPLETED',
          amount:          expense.amount,
          description:     `${expense.name} — ${monthName} ${data.year}`,
          transactionDate: new Date(data.paymentDate),
          reference:       data.reference,
        },
      })

      const updated = await tx.recurringExpenseObligation.update({
        where: { id: obligation!.id },
        data:  { status: 'PAID', transactionId: transaction.id },
      })

      return { obligation: updated, transaction }
    })
  },

  async findObligations(workspaceId: string, month?: number, year?: number) {
    const rows = await prisma.recurringExpenseObligation.findMany({
      where: {
        workspaceId,
        periodMonth: month,
        periodYear:  year,
      },
      include: {
        recurringExpense: { select: { id: true, name: true, categoryId: true } },
      },
      orderBy: { dueDate: 'asc' },
    })
    return rows.map(r => ({
      ...r,
      status: computePayrollStatus(r.status as PayrollObligationStatus, r.dueDate, r.amount, r.amount),
    }))
  },
}
