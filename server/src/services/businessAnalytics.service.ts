import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'
import { computeReceivableStatus } from './receivable.service.js'

interface DateFilter { workspaceId: string; from: Date; to: Date }

export const businessAnalyticsService = {
  /**
   * Resumen financiero del negocio diferenciando Facturado vs Cobrado.
   * facturado: sum(receivable.amount) con dueDate en rango (excluye CANCELLED)
   * cobrado:   sum(clientPayment.amount) con paymentDate en rango
   */
  async getBusinessSummary({ workspaceId, from, to }: DateFilter) {
    const [billedResult, collectedResult, expenseResult] = await Promise.all([
      prisma.receivable.aggregate({
        where: { workspaceId, status: { not: 'CANCELLED' }, dueDate: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.clientPayment.aggregate({
        where: { workspaceId, paymentDate: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { workspaceId, type: 'EXPENSE', status: 'COMPLETED', transactionDate: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
    ])

    const billed    = Number(billedResult._sum.amount    ?? 0)
    const collected = Number(collectedResult._sum.amount ?? 0)
    const expenses  = Number(expenseResult._sum.amount   ?? 0)
    const pending   = billed - collected

    return {
      billed,
      collected,
      pending:          Math.max(0, pending),
      expenses,
      operatingProfit:  collected - expenses,
      billedCount:      billedResult._count,
      collectedCount:   collectedResult._count,
    }
  },

  async getPendingReceivables(workspaceId: string, limit = 5) {
    const rows = await prisma.receivable.findMany({
      where:   { workspaceId, status: { notIn: ['PAID', 'CANCELLED'] } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
      take:    limit * 3, // tomar más para después filtrar/ordenar con status computado
    })

    const withStatus = rows
      .map(r => ({ ...r, status: computeReceivableStatus(r.status, r.dueDate, r.amountPaid, r.amount) }))
      .sort((a, b) => {
        // Orden: OVERDUE primero, luego por dueDate asc
        if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1
        if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
      .slice(0, limit)

    return withStatus
  },

  async getClientProfitability(clientId: string, workspaceId: string, from?: Date, to?: Date) {
    await prisma.client.findFirstOrThrow({ where: { id: clientId, workspaceId } })

    const [collectedResult, costsResult] = await Promise.all([
      prisma.clientPayment.aggregate({
        where: {
          clientId,
          workspaceId,
          paymentDate: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          clientId,
          workspaceId,
          type:   'EXPENSE',
          status: 'COMPLETED',
          transactionDate: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
    ])

    const collected   = Number(collectedResult._sum.amount ?? 0)
    const directCosts = Number(costsResult._sum.amount     ?? 0)
    const margin      = collected - directCosts
    const marginPct   = collected > 0 ? Math.round((margin / collected) * 100) : 0

    return { collected, directCosts, margin, marginPct }
  },

  async getOverdueTotal(workspaceId: string) {
    const rows = await prisma.receivable.findMany({
      where: { workspaceId, status: { notIn: ['PAID', 'CANCELLED'] }, dueDate: { lt: new Date() } },
      select: { amount: true, amountPaid: true },
    })
    return rows.reduce((sum, r) => sum + Number(new Decimal(r.amount).minus(r.amountPaid)), 0)
  },
}
