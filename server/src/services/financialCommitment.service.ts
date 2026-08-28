import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'
import { calculateAccountsBalance } from './accountBalance.service.js'

export const financialCommitmentService = {
  /** Deuda restante total (sum de cuotas activas pendientes/parcial/vencidas) */
  async getTotalDebt(workspaceId: string): Promise<number> {
    const rows = await prisma.debtInstallment.findMany({
      where: {
        workspaceId,
        status: { notIn: ['PAID', 'CANCELLED'] },
        debt:   { status: { notIn: ['PAID', 'CANCELLED'] } },
      },
      select: { amount: true, amountPaid: true },
    })
    return rows.reduce((s, r) => s + Number(new Decimal(r.amount).minus(r.amountPaid)), 0)
  },

  /** Nómina mensual esperada */
  async getMonthlyPayrollCommitment(workspaceId: string): Promise<number> {
    const result = await prisma.payrollRule.aggregate({
      where: { workspaceId, status: 'ACTIVE', frequency: 'MONTHLY' },
      _sum:  { amount: true },
    })
    return Number(result._sum.amount ?? 0)
  },

  /** Gastos fijos mensuales */
  async getMonthlyRecurringCommitment(workspaceId: string): Promise<number> {
    const result = await prisma.recurringExpense.aggregate({
      where: { workspaceId, isActive: true, frequency: 'MONTHLY' },
      _sum:  { amount: true },
    })
    return Number(result._sum.amount ?? 0)
  },

  /** Cuotas de deuda del mes actual pendientes */
  async getCurrentMonthInstallments(workspaceId: string): Promise<number> {
    const now    = new Date()
    const from   = new Date(now.getFullYear(), now.getMonth(), 1)
    const to     = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const rows   = await prisma.debtInstallment.findMany({
      where: {
        workspaceId,
        dueDate: { gte: from, lte: to },
        status:  { notIn: ['PAID', 'CANCELLED'] },
      },
      select: { amount: true, amountPaid: true },
    })
    return rows.reduce((s, r) => s + Number(new Decimal(r.amount).minus(r.amountPaid)), 0)
  },

  async getSummary(workspaceId: string) {
    const accounts = await prisma.account.findMany({
      where:  { workspaceId, isActive: true },
      select: { id: true },
    })
    const accountIds = accounts.map(a => a.id)

    const [balances, totalDebt, payrollCommitment, recurringCommitment, currentInstallments] = await Promise.all([
      calculateAccountsBalance(accountIds),
      financialCommitmentService.getTotalDebt(workspaceId),
      financialCommitmentService.getMonthlyPayrollCommitment(workspaceId),
      financialCommitmentService.getMonthlyRecurringCommitment(workspaceId),
      financialCommitmentService.getCurrentMonthInstallments(workspaceId),
    ])

    const totalBalance    = Object.values(balances).reduce((s, b) => s + b, 0)
    const monthlyCommitted = payrollCommitment + recurringCommitment + currentInstallments
    const realAvailable   = totalBalance - monthlyCommitted

    return {
      totalBalance,
      totalDebt,
      payrollCommitment,
      recurringCommitment,
      currentInstallments,
      monthlyCommitted,
      realAvailable,
    }
  },
}
