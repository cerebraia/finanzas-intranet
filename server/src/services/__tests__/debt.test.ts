import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { computeInstallmentStatus } from '../debt.service.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    debt:            { findFirstOrThrow: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    debtInstallment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), findFirstOrThrow: vi.fn() },
    debtPayment:     { create: vi.fn(), findFirstOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    transaction:     { create: vi.fn(), update: vi.fn() },
    $transaction:    vi.fn(),
  },
}))

import { prisma }            from '../../lib/prisma.js'
import { debtService }       from '../debt.service.js'
import { debtPaymentService } from '../debtPayment.service.js'

const mock = prisma as {
  debt:            { findFirstOrThrow: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  debtInstallment: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; findFirstOrThrow: ReturnType<typeof vi.fn> }
  debtPayment:     { create: ReturnType<typeof vi.fn>; findFirstOrThrow: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  transaction:     { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  $transaction:    ReturnType<typeof vi.fn>
}

const WS_ID  = 'ws-1'
const DEBT_ID = 'debt-1'
const INST_ID = 'inst-1'

const mockDebt = {
  id: DEBT_ID, workspaceId: WS_ID, name: 'MacBook Air',
  installments: 6, monthlyAmount: new Decimal('166.66'),
  startDate: new Date('2026-01-01'),
}

beforeEach(() => vi.clearAllMocks())

// ── computeInstallmentStatus ──────────────────────────────────────────────────

describe('computeInstallmentStatus', () => {
  const FUTURE  = new Date('2099-12-31')
  const PAST    = new Date('2020-01-01')

  it('devuelve PAID sin modificar', () => {
    expect(computeInstallmentStatus('PAID', FUTURE, new Decimal(100), new Decimal(100))).toBe('PAID')
  })

  it('devuelve CANCELLED sin modificar', () => {
    expect(computeInstallmentStatus('CANCELLED', PAST, new Decimal(0), new Decimal(100))).toBe('CANCELLED')
  })

  it('devuelve OVERDUE cuando dueDate es pasado y no PAID', () => {
    expect(computeInstallmentStatus('PENDING', PAST, new Decimal(0), new Decimal(100))).toBe('OVERDUE')
  })

  it('devuelve PARTIAL cuando hay pago parcial y fecha futura', () => {
    expect(computeInstallmentStatus('PENDING', FUTURE, new Decimal(50), new Decimal(100))).toBe('PARTIAL')
  })

  it('devuelve PENDING cuando no hay pago y fecha futura', () => {
    expect(computeInstallmentStatus('PENDING', FUTURE, new Decimal(0), new Decimal(100))).toBe('PENDING')
  })
})

// ── generateInstallments ──────────────────────────────────────────────────────

describe('debtService.generateInstallments', () => {
  it('crea 6 cuotas para una deuda con 6 installments', async () => {
    mock.debt.findFirstOrThrow.mockResolvedValue(mockDebt)
    mock.debtInstallment.findUnique.mockResolvedValue(null)
    mock.debtInstallment.create.mockResolvedValue({ id: 'inst' })

    const result = await debtService.generateInstallments(DEBT_ID, WS_ID)

    expect(result.created).toHaveLength(6)
    expect(result.skipped).toHaveLength(0)
    expect(mock.debtInstallment.create).toHaveBeenCalledTimes(6)
  })

  it('omite cuotas ya existentes', async () => {
    mock.debt.findFirstOrThrow.mockResolvedValue(mockDebt)
    mock.debtInstallment.findUnique
      .mockResolvedValueOnce({ id: 'existing-1' })
      .mockResolvedValueOnce({ id: 'existing-2' })
      .mockResolvedValue(null)
    mock.debtInstallment.create.mockResolvedValue({ id: 'inst' })

    const result = await debtService.generateInstallments(DEBT_ID, WS_ID)

    expect(result.created).toHaveLength(4)
    expect(result.skipped).toHaveLength(2)
    expect(mock.debtInstallment.create).toHaveBeenCalledTimes(4)
  })

  it('calcula fechas correctamente (cuota 2 = +1 mes desde startDate)', async () => {
    mock.debt.findFirstOrThrow.mockResolvedValue(mockDebt)
    mock.debtInstallment.findUnique.mockResolvedValue(null)

    let lastDueDate: Date | null = null
    mock.debtInstallment.create.mockImplementation(({ data }: { data: { dueDate: Date } }) => {
      lastDueDate = data.dueDate
      return Promise.resolve({ id: 'inst' })
    })

    await debtService.generateInstallments(DEBT_ID, WS_ID)

    // cuota 6 → startDate + 5 meses
    const expected = new Date('2026-01-01')
    expected.setMonth(expected.getMonth() + 5)
    expect(lastDueDate?.toDateString()).toBe(expected.toDateString())
  })
})

// ── debtPaymentService.register ───────────────────────────────────────────────

describe('debtPaymentService.register', () => {
  const installment = {
    id: INST_ID, debtId: DEBT_ID, number: 1,
    amount:     new Decimal('166.66'),
    amountPaid: new Decimal('0'),
    debt: { name: 'MacBook Air' },
  }

  function baseInput(amount: number) {
    return {
      workspaceId: WS_ID, debtId: DEBT_ID, installmentId: INST_ID,
      accountId: 'acc-1', amount, paymentDate: '2026-01-15', categoryId: 'cat-1',
    }
  }

  it('pago completo marca cuota como PAID', async () => {
    mock.debt.findFirstOrThrow.mockResolvedValue({ id: DEBT_ID })
    mock.debtInstallment.findFirstOrThrow.mockResolvedValue(installment)
    mock.debtInstallment.findMany.mockResolvedValue([{ status: 'PAID' }])
    mock.$transaction.mockImplementation(async (fn: (tx: typeof mock) => Promise<unknown>) => fn(mock))
    mock.transaction.create.mockResolvedValue({ id: 'tx-1' })
    mock.debtPayment.create.mockResolvedValue({ id: 'pay-1' })
    mock.debtInstallment.update.mockResolvedValue({ id: INST_ID, status: 'PAID', dueDate: new Date('2099-01-01'), amountPaid: new Decimal('166.66'), amount: new Decimal('166.66') })
    mock.debt.update.mockResolvedValue({})

    const result = await debtPaymentService.register(baseInput(166.66))

    expect(mock.debtInstallment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) })
    )
    expect(result.transaction).toBeDefined()
    expect(result.payment).toBeDefined()
  })

  it('pago parcial marca cuota como PARTIAL', async () => {
    mock.debt.findFirstOrThrow.mockResolvedValue({ id: DEBT_ID })
    mock.debtInstallment.findFirstOrThrow.mockResolvedValue(installment)
    mock.$transaction.mockImplementation(async (fn: (tx: typeof mock) => Promise<unknown>) => fn(mock))
    mock.transaction.create.mockResolvedValue({ id: 'tx-1' })
    mock.debtPayment.create.mockResolvedValue({ id: 'pay-1' })
    mock.debtInstallment.update.mockResolvedValue({ id: INST_ID, status: 'PARTIAL', dueDate: new Date('2099-01-01'), amountPaid: new Decimal('80'), amount: new Decimal('166.66') })
    mock.debtInstallment.findMany.mockResolvedValue([{ status: 'PARTIAL' }])
    mock.debt.update.mockResolvedValue({})

    const result = await debtPaymentService.register(baseInput(80))

    expect(mock.debtInstallment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PARTIAL' }) })
    )
  })

  it('rechaza pago mayor al pendiente', async () => {
    mock.debt.findFirstOrThrow.mockResolvedValue({ id: DEBT_ID })
    mock.debtInstallment.findFirstOrThrow.mockResolvedValue(installment)

    await expect(debtPaymentService.register(baseInput(999))).rejects.toThrow(/supera el pendiente/)
  })

  it('rechaza monto <= 0', async () => {
    mock.debt.findFirstOrThrow.mockResolvedValue({ id: DEBT_ID })
    mock.debtInstallment.findFirstOrThrow.mockResolvedValue(installment)

    await expect(debtPaymentService.register(baseInput(0))).rejects.toThrow(/mayor a 0/)
  })

  it('crea Transaction EXPENSE al pagar', async () => {
    mock.debt.findFirstOrThrow.mockResolvedValue({ id: DEBT_ID })
    mock.debtInstallment.findFirstOrThrow.mockResolvedValue(installment)
    mock.debtInstallment.findMany.mockResolvedValue([{ status: 'PAID' }])
    mock.$transaction.mockImplementation(async (fn: (tx: typeof mock) => Promise<unknown>) => fn(mock))
    mock.transaction.create.mockResolvedValue({ id: 'tx-1', type: 'EXPENSE' })
    mock.debtPayment.create.mockResolvedValue({ id: 'pay-1' })
    mock.debtInstallment.update.mockResolvedValue({ id: INST_ID, status: 'PAID', dueDate: new Date('2099-01-01'), amountPaid: new Decimal('166.66'), amount: new Decimal('166.66') })
    mock.debt.update.mockResolvedValue({})

    await debtPaymentService.register(baseInput(166.66))

    expect(mock.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'EXPENSE', status: 'COMPLETED' })
      })
    )
  })
})
