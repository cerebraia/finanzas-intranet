import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'

interface DateFilter { workspaceId: string; from: Date; to: Date }

export const payrollAnalyticsService = {
  /** Costo mensual esperado: suma de PayrollRules ACTIVE MONTHLY */
  async getMonthlyExpected(workspaceId: string): Promise<number> {
    const result = await prisma.payrollRule.aggregate({
      where: { workspaceId, status: 'ACTIVE', frequency: 'MONTHLY' },
      _sum:  { amount: true },
    })
    return Number(result._sum.amount ?? 0)
  },

  /** Total pagado en el período (excluye pagos cancelados) */
  async getMonthlyPaid({ workspaceId, from, to }: DateFilter): Promise<number> {
    const result = await prisma.payrollPayment.aggregate({
      where: { workspaceId, cancelled: false, paymentDate: { gte: from, lte: to } },
      _sum:  { amount: true },
    })
    return Number(result._sum.amount ?? 0)
  },

  /** Pendiente: suma de (amount - amountPaid) para obligaciones no pagadas/canceladas */
  async getOutstanding(workspaceId: string, month: number, year: number): Promise<number> {
    const rows = await prisma.payrollObligation.findMany({
      where: {
        workspaceId,
        status:      { notIn: ['PAID', 'CANCELLED'] },
        periodMonth: month,
        periodYear:  year,
      },
      select: { amount: true, amountPaid: true },
    })
    return rows.reduce((s, r) => s + Number(new Decimal(r.amount).minus(r.amountPaid)), 0)
  },

  async getSummary({ workspaceId, from, to }: DateFilter) {
    const month = from.getMonth() + 1
    const year  = from.getFullYear()

    const [expected, paid, outstanding] = await Promise.all([
      payrollAnalyticsService.getMonthlyExpected(workspaceId),
      payrollAnalyticsService.getMonthlyPaid({ workspaceId, from, to }),
      payrollAnalyticsService.getOutstanding(workspaceId, month, year),
    ])

    const overdueRows = await prisma.payrollObligation.findMany({
      where: {
        workspaceId,
        status: { notIn: ['PAID', 'CANCELLED'] },
        dueDate: { lt: new Date() },
      },
      select: { amount: true, amountPaid: true },
    })
    const overdue = overdueRows.reduce((s, r) => s + Number(new Decimal(r.amount).minus(r.amountPaid)), 0)

    return { expected, paid, outstanding, overdue }
  },
}
