import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    employee:          { findFirstOrThrow: vi.fn() },
    payrollObligation: { findFirstOrThrow: vi.fn(), findMany: vi.fn() },
    payrollPayment:    { findMany: vi.fn(), create: vi.fn(), findFirstOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    transaction:       { create: vi.fn(), update: vi.fn() },
    $transaction:      vi.fn(),
  },
}))

import { prisma } from '../../lib/prisma.js'
import { payrollPaymentService } from '../payrollPayment.service.js'

const mock = prisma as {
  employee:          { findFirstOrThrow: ReturnType<typeof vi.fn> }
  payrollObligation: { findFirstOrThrow: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  payrollPayment:    { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; findFirstOrThrow: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> }
  transaction:       { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  $transaction:      ReturnType<typeof vi.fn>
}

const WS_ID   = 'ws-ads'
const EMP_ID  = 'emp-leo'
const OBL_ID  = 'obl-1'

function makeObligation(amount: number, amountPaid: number, dueDate = '2099-12-31') {
  return {
    id: OBL_ID, workspaceId: WS_ID, employeeId: EMP_ID,
    amount:     new Decimal(amount),
    amountPaid: new Decimal(amountPaid),
    dueDate:    new Date(dueDate),
    status:     'PENDING' as const,
    description: 'Nómina Agosto 2026 — Leo Aguado',
    employee: { name: 'Leo Aguado' },
  }
}

function baseInput(amount: number) {
  return {
    workspaceId: WS_ID, employeeId: EMP_ID, payrollObligationId: OBL_ID,
    accountId: 'acc-zelle', amount, paymentDate: '2026-08-15',
    payrollCategoryId: 'cat-nomina',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mock.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
    fn({
      transaction:       { create: mock.transaction.create, update: mock.transaction.update },
      payrollPayment:    { create: mock.payrollPayment.create, update: mock.payrollPayment.update },
      payrollObligation: { update: mock.payrollObligation.findFirstOrThrow },
    } as unknown as typeof prisma)
  )
})

describe('payrollPaymentService.register', () => {
  it('pago completo → obligación PAID', async () => {
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce(makeObligation(400, 0))
    mock.transaction.create.mockResolvedValue({ id: 'tx-1' })
    mock.payrollPayment.create.mockResolvedValue({ id: 'pay-1' })
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce({
      ...makeObligation(400, 400), status: 'PAID', payrollRule: null, payments: [],
    })

    const result = await payrollPaymentService.register(baseInput(400))

    expect(result.obligation.status).toBe('PAID')
  })

  it('pago parcial → obligación PARTIAL', async () => {
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce(makeObligation(400, 0))
    mock.transaction.create.mockResolvedValue({ id: 'tx-1' })
    mock.payrollPayment.create.mockResolvedValue({ id: 'pay-1' })
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce({
      ...makeObligation(400, 250), status: 'PARTIAL', payrollRule: null, payments: [],
    })

    const result = await payrollPaymentService.register(baseInput(250))

    expect(result.obligation.status).toBe('PARTIAL')
  })

  it('pago crea Transaction de tipo EXPENSE (no INCOME)', async () => {
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce(makeObligation(400, 0))
    mock.transaction.create.mockResolvedValue({ id: 'tx-expense' })
    mock.payrollPayment.create.mockResolvedValue({ id: 'pay-1' })
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce({
      ...makeObligation(400, 400), status: 'PAID', payrollRule: null, payments: [],
    })

    await payrollPaymentService.register(baseInput(400))

    const txData = mock.transaction.create.mock.calls[0][0].data
    expect(txData.type).toBe('EXPENSE')
    expect(txData.status).toBe('COMPLETED')
  })

  it('no permite sobrepago', async () => {
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce(makeObligation(400, 300))

    await expect(payrollPaymentService.register(baseInput(200))).rejects.toThrow(/supera/)
  })

  it('no permite monto cero o negativo', async () => {
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce(makeObligation(400, 0))

    await expect(payrollPaymentService.register(baseInput(0))).rejects.toThrow(/mayor a 0/)
  })

  it('workspace isolation: findFirstOrThrow falla con workspace incorrecto', async () => {
    mock.payrollObligation.findFirstOrThrow.mockRejectedValue(new Error('Record not found'))

    await expect(payrollPaymentService.register({ ...baseInput(100), workspaceId: 'otro-ws' })).rejects.toThrow()
  })

  it('pago crea descripción con nombre del empleado', async () => {
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce(makeObligation(400, 0))
    mock.transaction.create.mockResolvedValue({ id: 'tx-1' })
    mock.payrollPayment.create.mockResolvedValue({ id: 'pay-1' })
    mock.payrollObligation.findFirstOrThrow.mockResolvedValueOnce({
      ...makeObligation(400, 400), status: 'PAID', payrollRule: null, payments: [],
    })

    await payrollPaymentService.register(baseInput(400))

    const txData = mock.transaction.create.mock.calls[0][0].data
    expect(txData.description).toContain('Leo Aguado')
  })
})
