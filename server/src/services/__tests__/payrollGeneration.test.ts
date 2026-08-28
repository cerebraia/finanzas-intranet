import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    payrollRule:        { findMany: vi.fn() },
    payrollObligation:  { findUnique: vi.fn(), create: vi.fn() },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { payrollGenerationService } from '../payrollGeneration.service.js'

const mock = prisma as {
  payrollRule:       { findMany: ReturnType<typeof vi.fn> }
  payrollObligation: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
}

const WS_ID = 'ws-ads'
const MONTH = 8
const YEAR  = 2026

const mockRule = {
  id:         'rule-1',
  paymentDay: 15,
  amount:     { toString: () => '400' },
  employee:   { id: 'emp-1', name: 'Leo Aguado', workspaceId: WS_ID },
}

beforeEach(() => vi.clearAllMocks())

describe('payrollGenerationService.generateMonthlyPayroll', () => {
  it('crea obligación cuando no existe', async () => {
    mock.payrollRule.findMany.mockResolvedValue([mockRule])
    mock.payrollObligation.findUnique.mockResolvedValue(null)
    mock.payrollObligation.create.mockResolvedValue({ id: 'obl-1' })

    const result = await payrollGenerationService.generateMonthlyPayroll(WS_ID, MONTH, YEAR)

    expect(result.created).toHaveLength(1)
    expect(result.created[0]).toBe('Leo Aguado')
    expect(result.skipped).toHaveLength(0)
    expect(mock.payrollObligation.create).toHaveBeenCalledOnce()
  })

  it('no duplica si ya existe la obligación para ese período', async () => {
    mock.payrollRule.findMany.mockResolvedValue([mockRule])
    mock.payrollObligation.findUnique.mockResolvedValue({ id: 'existing' })

    const result = await payrollGenerationService.generateMonthlyPayroll(WS_ID, MONTH, YEAR)

    expect(result.created).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
    expect(mock.payrollObligation.create).not.toHaveBeenCalled()
  })

  it('crea obligación con dueDate correcto según paymentDay', async () => {
    mock.payrollRule.findMany.mockResolvedValue([{ ...mockRule, paymentDay: 30 }])
    mock.payrollObligation.findUnique.mockResolvedValue(null)
    mock.payrollObligation.create.mockResolvedValue({ id: 'obl-1' })

    await payrollGenerationService.generateMonthlyPayroll(WS_ID, MONTH, YEAR)

    const callData = mock.payrollObligation.create.mock.calls[0][0].data
    const dueDate  = new Date(callData.dueDate)
    expect(dueDate.getDate()).toBe(30)
    expect(dueDate.getMonth() + 1).toBe(MONTH)
    expect(dueDate.getFullYear()).toBe(YEAR)
  })

  it('devuelve created/skipped y los valores de mes/año', async () => {
    mock.payrollRule.findMany.mockResolvedValue([])

    const result = await payrollGenerationService.generateMonthlyPayroll(WS_ID, MONTH, YEAR)

    expect(result.month).toBe(MONTH)
    expect(result.year).toBe(YEAR)
    expect(result.created).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
  })
})
