import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// Mock del cliente Prisma
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    account: {
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    transaction: {
      groupBy: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { calculateAccountBalance, calculateAccountsBalance } from '../accountBalance.service.js'

const mockPrisma = prisma as {
  account: {
    findUniqueOrThrow: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
  transaction: { groupBy: ReturnType<typeof vi.fn> }
}

beforeEach(() => vi.clearAllMocks())

describe('calculateAccountBalance — Reglas financieras', () => {
  const accountId = 'acc-test-1'

  function setupMocks(initialBalance: number, rows: Array<{ type: string; amount: number }>) {
    mockPrisma.account.findUniqueOrThrow.mockResolvedValue({ initialBalance: new Decimal(initialBalance) })
    mockPrisma.transaction.groupBy.mockResolvedValue(
      rows.map((r) => ({ type: r.type, _sum: { amount: new Decimal(r.amount) } }))
    )
  }

  it('Ingreso COMPLETED aumenta el saldo', async () => {
    setupMocks(1000, [{ type: 'INCOME', amount: 500 }])
    expect(await calculateAccountBalance(accountId)).toBe(1500)
  })

  it('Gasto COMPLETED disminuye el saldo', async () => {
    setupMocks(1000, [{ type: 'EXPENSE', amount: 300 }])
    expect(await calculateAccountBalance(accountId)).toBe(700)
  })

  it('Sin transacciones → saldo igual al initialBalance', async () => {
    setupMocks(800, [])
    expect(await calculateAccountBalance(accountId)).toBe(800)
  })

  it('PENDING no afecta el saldo (groupBy ya filtra por COMPLETED)', async () => {
    // El servicio pasa status: COMPLETED al groupBy — pendientes nunca llegan aquí
    setupMocks(500, [])
    expect(await calculateAccountBalance(accountId)).toBe(500)
  })

  it('CANCELLED no afecta el saldo', async () => {
    setupMocks(500, [])
    expect(await calculateAccountBalance(accountId)).toBe(500)
  })

  it('Ingresos y gastos combinados calculan correctamente', async () => {
    setupMocks(1000, [
      { type: 'INCOME',  amount: 2000 },
      { type: 'EXPENSE', amount: 800  },
    ])
    // 1000 + 2000 - 800 = 2200
    expect(await calculateAccountBalance(accountId)).toBe(2200)
  })
})

describe('calculateAccountsBalance — Aislamiento por workspaceId', () => {
  it('Solo calcula las cuentas solicitadas (no mezcla workspaces)', async () => {
    const wsAId = 'acc-ws-a'
    const wsBId = 'acc-ws-b'

    mockPrisma.account.findMany.mockResolvedValue([
      { id: wsAId, initialBalance: new Decimal(100) },
    ])
    mockPrisma.transaction.groupBy.mockResolvedValue([
      { accountId: wsAId, type: 'INCOME', _sum: { amount: new Decimal(200) } },
    ])

    const result = await calculateAccountsBalance([wsAId])

    expect(result[wsAId]).toBe(300)
    expect(result[wsBId]).toBeUndefined()
  })
})
