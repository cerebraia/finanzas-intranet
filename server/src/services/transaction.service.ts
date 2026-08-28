import { prisma } from '../lib/prisma.js'
import type { TransactionType, TransactionStatus } from '@prisma/client'

interface ListTransactionsInput {
  workspaceId: string
  from?: string
  to?: string
  type?: TransactionType
  categoryId?: string
  accountId?: string
  status?: TransactionStatus
  q?: string
}

interface CreateTransactionInput {
  workspaceId: string
  accountId: string
  categoryId: string
  clientId?: string | null
  type: TransactionType
  amount: number
  description: string
  transactionDate: string
  status?: TransactionStatus
  notes?: string
  reference?: string
}

interface UpdateTransactionInput {
  accountId?: string
  categoryId?: string
  clientId?: string | null
  amount?: number
  description?: string
  transactionDate?: string
  status?: TransactionStatus
  notes?: string
  reference?: string
}

const includeRelations = {
  account: { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, type: true, color: true, icon: true } },
}

export const transactionService = {
  async findAll(params: ListTransactionsInput) {
    const { workspaceId, from, to, type, categoryId, accountId, status, q } = params

    return prisma.transaction.findMany({
      where: {
        workspaceId,
        type:       type       ?? undefined,
        categoryId: categoryId ?? undefined,
        accountId:  accountId  ?? undefined,
        status:     status     ?? undefined,
        transactionDate: {
          gte: from ? new Date(from) : undefined,
          lte: to   ? new Date(to)  : undefined,
        },
        ...(q
          ? {
              OR: [
                { description: { contains: q, mode: 'insensitive' } },
                { notes:       { contains: q, mode: 'insensitive' } },
                { reference:   { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: includeRelations,
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    })
  },

  async findById(id: string, workspaceId: string) {
    return prisma.transaction.findFirstOrThrow({
      where: { id, workspaceId },
      include: includeRelations,
    })
  },

  async create(data: CreateTransactionInput) {
    return prisma.transaction.create({
      data: {
        workspaceId:     data.workspaceId,
        accountId:       data.accountId,
        categoryId:      data.categoryId,
        clientId:        data.clientId ?? null,
        type:            data.type,
        amount:          data.amount,
        description:     data.description,
        transactionDate: new Date(data.transactionDate),
        status:          data.status ?? 'COMPLETED',
        notes:           data.notes,
        reference:       data.reference,
      },
      include: includeRelations,
    })
  },

  async update(id: string, workspaceId: string, data: UpdateTransactionInput) {
    await prisma.transaction.findFirstOrThrow({ where: { id, workspaceId } })
    return prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
        amount: data.amount !== undefined ? data.amount : undefined,
      },
      include: includeRelations,
    })
  },

  async cancel(id: string, workspaceId: string) {
    await prisma.transaction.findFirstOrThrow({ where: { id, workspaceId } })
    return prisma.transaction.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: includeRelations,
    })
  },

  async remove(id: string, workspaceId: string) {
    await prisma.transaction.findFirstOrThrow({ where: { id, workspaceId } })
    return prisma.transaction.delete({ where: { id } })
  },
}
