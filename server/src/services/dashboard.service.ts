import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'

interface DateFilter {
  workspaceId: string
  from: Date
  to: Date
}

export const dashboardService = {
  async getSummary({ workspaceId, from, to }: DateFilter) {
    const [incomeResult, expenseResult, pendingResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { workspaceId, type: 'INCOME', status: 'COMPLETED', transactionDate: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { workspaceId, type: 'EXPENSE', status: 'COMPLETED', transactionDate: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { workspaceId, status: 'PENDING', transactionDate: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const totalIncome  = Number(incomeResult._sum.amount  ?? 0)
    const totalExpense = Number(expenseResult._sum.amount ?? 0)
    const totalPending = Number(pendingResult._sum.amount ?? 0)
    const balance = totalIncome - totalExpense

    return {
      income:       { total: totalIncome,  count: incomeResult._count  },
      expenses:     { total: totalExpense, count: expenseResult._count },
      balance,
      pending:      { total: totalPending, count: pendingResult._count },
      available:    balance,
      committed:    totalPending,
      projection:   balance + totalPending - totalPending,
    }
  },

  async getCashFlow(workspaceId: string, year: number) {
    const from = new Date(year, 0, 1)
    const to   = new Date(year, 11, 31)

    const rows = await prisma.transaction.findMany({
      where: {
        workspaceId,
        status: 'COMPLETED',
        transactionDate: { gte: from, lte: to },
      },
      select: { type: true, amount: true, transactionDate: true },
    })

    const MONTH_NAMES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
    const byMonth: Record<number, { income: Decimal; expenses: Decimal }> = {}
    for (let i = 0; i < 12; i++) {
      byMonth[i] = { income: new Decimal(0), expenses: new Decimal(0) }
    }

    for (const row of rows) {
      const m = new Date(row.transactionDate).getMonth()
      if (row.type === 'INCOME')  byMonth[m].income   = byMonth[m].income.plus(row.amount)
      if (row.type === 'EXPENSE') byMonth[m].expenses = byMonth[m].expenses.plus(row.amount)
    }

    return MONTH_NAMES.map((month, i) => ({
      month,
      income:   Number(byMonth[i].income),
      expenses: Number(byMonth[i].expenses),
    }))
  },

  async getExpenseDistribution({ workspaceId, from, to }: DateFilter) {
    const rows = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        workspaceId,
        type: 'EXPENSE',
        status: 'COMPLETED',
        transactionDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    })

    if (rows.length === 0) return []

    const categoryIds = rows.map((r) => r.categoryId)
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true },
    })
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

    const total = rows.reduce((s, r) => s + Number(r._sum.amount ?? 0), 0)

    const PALETTE = ['#7C3AED','#A78BFA','#60A5FA','#34D399','#F59E0B','#F87171','#818CF8','#6EE7B7']

    return rows.map((row, i) => {
      const cat = catMap[row.categoryId]
      const value = Number(row._sum.amount ?? 0)
      return {
        name:       cat?.name ?? 'Sin categoría',
        value,
        color:      cat?.color ?? PALETTE[i % PALETTE.length],
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      }
    })
  },
}
