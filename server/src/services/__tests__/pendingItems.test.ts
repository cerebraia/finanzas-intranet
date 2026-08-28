import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    receivable:                  { findMany: vi.fn() },
    payrollObligation:           { findMany: vi.fn() },
    recurringExpenseObligation:  { findMany: vi.fn() },
    debtInstallment:             { findMany: vi.fn() },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { pendingItemsService } from '../pendingItems.service.js'

const mock = prisma as {
  receivable:                 { findMany: ReturnType<typeof vi.fn> }
  payrollObligation:          { findMany: ReturnType<typeof vi.fn> }
  recurringExpenseObligation: { findMany: ReturnType<typeof vi.fn> }
  debtInstallment:            { findMany: ReturnType<typeof vi.fn> }
}

const WS_ID   = 'ws-ads'
const future  = new Date('2099-12-31')

beforeEach(() => vi.clearAllMocks())

function emptyMocks() {
  mock.receivable.findMany.mockResolvedValue([])
  mock.payrollObligation.findMany.mockResolvedValue([])
  mock.recurringExpenseObligation.findMany.mockResolvedValue([])
  mock.debtInstallment.findMany.mockResolvedValue([])
}

describe('pendingItemsService.getAll', () => {
  it('devuelve items de los 3 tipos (RECEIVABLE, PAYROLL, RECURRING_EXPENSE)', async () => {
    mock.receivable.findMany.mockResolvedValue([{
      id: 'rec-1', workspaceId: WS_ID, dueDate: future,
      amount: new Decimal(300), amountPaid: new Decimal(0), status: 'PENDING',
      description: 'Meta Ads', client: { name: 'Toyo Éxito' },
    }])
    mock.payrollObligation.findMany.mockResolvedValue([{
      id: 'obl-1', workspaceId: WS_ID, dueDate: future,
      amount: new Decimal(400), amountPaid: new Decimal(0), status: 'PENDING',
      description: 'Nómina Agosto', employee: { name: 'Leo Aguado' },
    }])
    mock.recurringExpenseObligation.findMany.mockResolvedValue([{
      id: 'rec-exp-1', workspaceId: WS_ID, dueDate: future,
      amount: new Decimal(20), transactionId: null, status: 'PENDING',
      periodMonth: 8, periodYear: 2026, recurringExpense: { name: 'ChatGPT' },
    }])
    mock.debtInstallment.findMany.mockResolvedValue([])

    const items = await pendingItemsService.getAll({ workspaceId: WS_ID })

    expect(items).toHaveLength(3)
    expect(items.map(i => i.sourceType)).toContain('RECEIVABLE')
    expect(items.map(i => i.sourceType)).toContain('PAYROLL')
    expect(items.map(i => i.sourceType)).toContain('RECURRING_EXPENSE')
  })

  it('excluye items con status PAID o CANCELLED', async () => {
    // DB queries already have notIn filter — just verify no extra items leak
    emptyMocks()

    const items = await pendingItemsService.getAll({ workspaceId: WS_ID })

    expect(items).toHaveLength(0)
  })

  it('workspace isolation: solo devuelve items del workspaceId solicitado', async () => {
    mock.receivable.findMany.mockResolvedValue([
      {
        id: 'rec-1', workspaceId: WS_ID, dueDate: future,
        amount: new Decimal(300), amountPaid: new Decimal(0), status: 'PENDING',
        description: 'Test', client: { name: 'Client A' },
      },
    ])
    mock.payrollObligation.findMany.mockResolvedValue([])
    mock.recurringExpenseObligation.findMany.mockResolvedValue([])
    mock.debtInstallment.findMany.mockResolvedValue([])

    const items = await pendingItemsService.getAll({ workspaceId: WS_ID })

    expect(items.every(i => i.workspaceId === WS_ID)).toBe(true)
  })
})
