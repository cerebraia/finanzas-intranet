import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'
import type { DebtStatus, InstallmentStatus } from '@prisma/client'

export function computeInstallmentStatus(
  status: InstallmentStatus,
  dueDate: Date,
  amountPaid: Decimal,
  amount: Decimal,
): InstallmentStatus {
  if (status === 'PAID' || status === 'CANCELLED') return status
  const isPastDue = new Date(dueDate) < new Date(new Date().toDateString())
  if (isPastDue) return 'OVERDUE'
  if (amountPaid.greaterThan(0)) return 'PARTIAL'
  return 'PENDING'
}

const includeInstallments = {
  debtInstallments: {
    orderBy: { number: 'asc' as const },
  },
}

export const debtService = {
  async findAll(workspaceId: string, type?: string) {
    const debts = await prisma.debt.findMany({
      where: {
        workspaceId,
        status: { notIn: ['CANCELLED'] },
        type:   type ? (type as 'CASHEA') : undefined,
      },
      include: includeInstallments,
      orderBy: { createdAt: 'desc' },
    })

    return debts.map(d => enrichDebt(d))
  },

  async findById(id: string, workspaceId: string) {
    const debt = await prisma.debt.findFirstOrThrow({
      where: { id, workspaceId },
      include: {
        debtInstallments: {
          orderBy: { number: 'asc' },
          include: {
            payments: {
              where:   { cancelled: false },
              select:  { id: true, amount: true, paymentDate: true, reference: true },
            },
          },
        },
        payments: {
          where:   { cancelled: false },
          include: { account: { select: { id: true, name: true } } },
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    return enrichDebt(debt)
  },

  async create(data: {
    workspaceId:    string
    name:           string
    provider?:      string
    description?:   string
    type:           string
    originalAmount: number
    downPayment?:   number
    financedAmount: number
    installments:   number
    monthlyAmount:  number
    startDate:      string
    notes?:         string
  }) {
    const debt = await prisma.debt.create({
      data: {
        workspaceId:    data.workspaceId,
        name:           data.name,
        provider:       data.provider,
        description:    data.description,
        type:           data.type as 'CASHEA',
        originalAmount: data.originalAmount,
        downPayment:    data.downPayment ?? 0,
        financedAmount: data.financedAmount,
        installments:   data.installments,
        monthlyAmount:  data.monthlyAmount,
        startDate:      new Date(data.startDate),
        notes:          data.notes,
      },
      include: includeInstallments,
    })

    // Generate installments immediately
    await debtService.generateInstallments(debt.id, data.workspaceId)

    return debtService.findById(debt.id, data.workspaceId)
  },

  async update(id: string, workspaceId: string, data: Partial<{
    name: string; provider: string; description: string; status: DebtStatus; notes: string
  }>) {
    await prisma.debt.findFirstOrThrow({ where: { id, workspaceId } })
    return prisma.debt.update({ where: { id }, data, include: includeInstallments })
  },

  async generateInstallments(debtId: string, workspaceId: string) {
    const debt = await prisma.debt.findFirstOrThrow({ where: { id: debtId, workspaceId } })

    const created: number[] = []
    const skipped: number[] = []

    for (let i = 1; i <= debt.installments; i++) {
      const exists = await prisma.debtInstallment.findUnique({
        where: { debtId_number: { debtId, number: i } },
      })

      if (exists) { skipped.push(i); continue }

      const dueDate = new Date(debt.startDate)
      dueDate.setMonth(dueDate.getMonth() + (i - 1))

      await prisma.debtInstallment.create({
        data: {
          debtId,
          workspaceId,
          number:  i,
          amount:  debt.monthlyAmount,
          dueDate,
        },
      })
      created.push(i)
    }

    return { created, skipped }
  },

  async findInstallments(debtId: string, workspaceId: string) {
    await prisma.debt.findFirstOrThrow({ where: { id: debtId, workspaceId } })
    const rows = await prisma.debtInstallment.findMany({
      where:   { debtId },
      include: {
        payments: {
          where:  { cancelled: false },
          select: { id: true, amount: true, paymentDate: true, reference: true },
        },
      },
      orderBy: { number: 'asc' },
    })
    return rows.map(r => ({
      ...r,
      status: computeInstallmentStatus(r.status, r.dueDate, r.amountPaid, r.amount),
    }))
  },
}

function enrichDebt(debt: {
  id: string
  debtInstallments: Array<{
    status: InstallmentStatus
    dueDate: Date
    amountPaid: Decimal
    amount: Decimal
    number: number
  }>
  [key: string]: unknown
}) {
  const installments = debt.debtInstallments.map(inst => ({
    ...inst,
    status: computeInstallmentStatus(inst.status, inst.dueDate, inst.amountPaid, inst.amount),
  }))

  const totalPaid = installments.reduce((s, i) => s + Number(i.amountPaid), 0)
  const totalAmount = installments.reduce((s, i) => s + Number(i.amount), 0)
  const outstanding = totalAmount - totalPaid

  const nextInstallment = installments
    .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null

  const paidCount = installments.filter(i => i.status === 'PAID').length
  const completionPct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0

  return {
    ...debt,
    debtInstallments: installments,
    summary: {
      totalAmount,
      totalPaid,
      outstanding,
      paidCount,
      pendingCount: debt.debtInstallments.length - paidCount,
      completionPct,
      nextInstallment,
    },
  }
}
