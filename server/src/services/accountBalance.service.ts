import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Fórmula única de saldo de cuenta:
 * currentBalance = initialBalance + SUM(INCOME COMPLETED) - SUM(EXPENSE COMPLETED)
 *
 * PENDING y CANCELLED no afectan el saldo.
 * TRANSFER se maneja en hito futuro via modelo Transfer.
 */
export async function calculateAccountBalance(accountId: string): Promise<number> {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    select: { initialBalance: true },
  })

  const result = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      accountId,
      status: 'COMPLETED',
    },
    _sum: { amount: true },
  })

  let income = new Decimal(0)
  let expense = new Decimal(0)

  for (const row of result) {
    if (row.type === 'INCOME')  income  = row._sum.amount ?? new Decimal(0)
    if (row.type === 'EXPENSE') expense = row._sum.amount ?? new Decimal(0)
  }

  return Number(
    new Decimal(account.initialBalance).plus(income).minus(expense)
  )
}

export async function calculateAccountsBalance(accountIds: string[]): Promise<Record<string, number>> {
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, initialBalance: true },
  })

  const transactionSums = await prisma.transaction.groupBy({
    by: ['accountId', 'type'],
    where: {
      accountId: { in: accountIds },
      status: 'COMPLETED',
    },
    _sum: { amount: true },
  })

  const sumMap: Record<string, { income: Decimal; expense: Decimal }> = {}
  for (const id of accountIds) {
    sumMap[id] = { income: new Decimal(0), expense: new Decimal(0) }
  }
  for (const row of transactionSums) {
    if (!sumMap[row.accountId]) continue
    if (row.type === 'INCOME')  sumMap[row.accountId].income  = row._sum.amount ?? new Decimal(0)
    if (row.type === 'EXPENSE') sumMap[row.accountId].expense = row._sum.amount ?? new Decimal(0)
  }

  const result: Record<string, number> = {}
  for (const acc of accounts) {
    const { income, expense } = sumMap[acc.id] ?? { income: new Decimal(0), expense: new Decimal(0) }
    result[acc.id] = Number(new Decimal(acc.initialBalance).plus(income).minus(expense))
  }
  return result
}
