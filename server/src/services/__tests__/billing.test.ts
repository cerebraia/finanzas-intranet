import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    clientService: { findMany: vi.fn() },
    receivable:    { findUnique: vi.fn(), create: vi.fn() },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { billingService } from '../billing.service.js'

const mockPrisma = prisma as {
  clientService: { findMany: ReturnType<typeof vi.fn> }
  receivable:    { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
}

const WORKSPACE_ID = 'ws-ads'
const MONTH = 8
const YEAR  = 2026

const mockClientService = {
  id: 'cs-1',
  billingDay: 15,
  price: { toString: () => '300' },
  client:  { id: 'client-1', name: 'Toyo Éxito', workspaceId: WORKSPACE_ID },
  service: { id: 'svc-1',    name: 'Meta Ads' },
}

beforeEach(() => vi.clearAllMocks())

describe('billingService.generateMonthlyReceivables', () => {
  it('crea una cuenta por cobrar cuando no existe', async () => {
    mockPrisma.clientService.findMany.mockResolvedValue([mockClientService])
    mockPrisma.receivable.findUnique.mockResolvedValue(null)
    mockPrisma.receivable.create.mockResolvedValue({ id: 'rec-1' })

    const result = await billingService.generateMonthlyReceivables(WORKSPACE_ID, MONTH, YEAR)

    expect(result.created).toHaveLength(1)
    expect(result.created[0]).toContain('Toyo Éxito')
    expect(result.skipped).toHaveLength(0)
    expect(mockPrisma.receivable.create).toHaveBeenCalledOnce()
  })

  it('omite si ya existe receivable para ese período (no duplica)', async () => {
    mockPrisma.clientService.findMany.mockResolvedValue([mockClientService])
    mockPrisma.receivable.findUnique.mockResolvedValue({ id: 'existing-rec' })

    const result = await billingService.generateMonthlyReceivables(WORKSPACE_ID, MONTH, YEAR)

    expect(result.created).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
    expect(mockPrisma.receivable.create).not.toHaveBeenCalled()
  })

  it('crea receivable con dueDate correcto según billingDay', async () => {
    mockPrisma.clientService.findMany.mockResolvedValue([{ ...mockClientService, billingDay: 20 }])
    mockPrisma.receivable.findUnique.mockResolvedValue(null)
    mockPrisma.receivable.create.mockResolvedValue({ id: 'rec-1' })

    await billingService.generateMonthlyReceivables(WORKSPACE_ID, MONTH, YEAR)

    const callData = mockPrisma.receivable.create.mock.calls[0][0].data
    const dueDate  = new Date(callData.dueDate)
    expect(dueDate.getDate()).toBe(20)
    expect(dueDate.getMonth() + 1).toBe(MONTH)
    expect(dueDate.getFullYear()).toBe(YEAR)
  })

  it('devuelve mes y año correctos en el resultado', async () => {
    mockPrisma.clientService.findMany.mockResolvedValue([])

    const result = await billingService.generateMonthlyReceivables(WORKSPACE_ID, MONTH, YEAR)

    expect(result.month).toBe(MONTH)
    expect(result.year).toBe(YEAR)
  })
})
