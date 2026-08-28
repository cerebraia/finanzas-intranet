import { prisma } from '../lib/prisma.js'
import { calculateAccountsBalance } from './accountBalance.service.js'
import type { AccountType, Currency } from '@prisma/client'

interface CreateAccountInput {
  workspaceId: string
  name: string
  type: AccountType
  currency?: Currency
  initialBalance?: number
}

interface UpdateAccountInput {
  name?: string
  type?: AccountType
  currency?: Currency
  initialBalance?: number
  isActive?: boolean
}

export const accountService = {
  async findAll(workspaceId: string) {
    const accounts = await prisma.account.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    const ids = accounts.map((a) => a.id)
    const balances = await calculateAccountsBalance(ids)
    return accounts.map((a) => ({ ...a, currentBalance: balances[a.id] ?? 0 }))
  },

  async findById(id: string) {
    const account = await prisma.account.findUniqueOrThrow({ where: { id } })
    const { [id]: currentBalance } = await calculateAccountsBalance([id])
    return { ...account, currentBalance: currentBalance ?? 0 }
  },

  async create(data: CreateAccountInput) {
    return prisma.account.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        type: data.type,
        currency: data.currency ?? 'USD',
        initialBalance: data.initialBalance ?? 0,
      },
    })
  },

  async update(id: string, data: UpdateAccountInput) {
    return prisma.account.update({ where: { id }, data })
  },

  async remove(id: string) {
    // Soft delete — no eliminar cuentas con transacciones
    const count = await prisma.transaction.count({ where: { accountId: id } })
    if (count > 0) {
      return prisma.account.update({ where: { id }, data: { isActive: false } })
    }
    return prisma.account.delete({ where: { id } })
  },
}
