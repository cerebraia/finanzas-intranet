import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    client:        { findFirstOrThrow: vi.fn() },
    receivable:    { findFirstOrThrow: vi.fn(), update: vi.fn() },
    clientPayment: { findMany: vi.fn(), create: vi.fn() },
    transaction:   { create: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

import { prisma } from '../../lib/prisma.js'
import { clientPaymentService } from '../clientPayment.service.js'

const mockPrisma = prisma as {
  client:        { findFirstOrThrow: ReturnType<typeof vi.fn> }
  receivable:    { findFirstOrThrow: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  clientPayment: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  transaction:   { create: ReturnType<typeof vi.fn> }
  $transaction:  ReturnType<typeof vi.fn>
}

const WS_ID   = 'ws-ads'
const CLIENT_ID = 'client-1'
const REC_ID  = 'rec-1'

function makeReceivable(amount: number, amountPaid: number, dueDate = '2099-12-31') {
  return {
    id: REC_ID,
    workspaceId: WS_ID,
    clientId: CLIENT_ID,
    amount:     new Decimal(amount),
    amountPaid: new Decimal(amountPaid),
    dueDate:    new Date(dueDate),
    status:     'PENDING' as const,
    description: 'Meta Ads Agosto',
    client: { name: 'Toyo Éxito' },
  }
}

function baseInput(amount: number) {
  return {
    workspaceId: WS_ID,
    clientId: CLIENT_ID,
    receivableId: REC_ID,
    accountId: 'acc-1',
    amount,
    paymentDate: '2026-08-15',
    clientsCategoryId: 'cat-clientes',
  }
}

beforeEach(() => {
  vi.clearAllMocks()

  // Mock $transaction to execute the callback
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
    return fn({
      transaction:   { create: mockPrisma.transaction.create },
      clientPayment: { create: mockPrisma.clientPayment.create },
      receivable:    { update: mockPrisma.receivable.update },
    } as unknown as typeof prisma)
  })
})

describe('clientPaymentService.register', () => {
  it('pago completo → receivable status PAID', async () => {
    mockPrisma.receivable.findFirstOrThrow.mockResolvedValue(makeReceivable(300, 0))
    mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-1' })
    mockPrisma.clientPayment.create.mockResolvedValue({ id: 'pay-1' })
    mockPrisma.receivable.update.mockResolvedValue({
      ...makeReceivable(300, 300), status: 'PAID',
      clientService: null, payments: [],
    })

    const result = await clientPaymentService.register(baseInput(300))

    const updateCall = mockPrisma.receivable.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('PAID')
    expect(result.receivable.status).toBe('PAID')
  })

  it('pago parcial → receivable status PARTIAL', async () => {
    mockPrisma.receivable.findFirstOrThrow.mockResolvedValue(makeReceivable(300, 0))
    mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-1' })
    mockPrisma.clientPayment.create.mockResolvedValue({ id: 'pay-1' })
    mockPrisma.receivable.update.mockResolvedValue({
      ...makeReceivable(300, 200), status: 'PARTIAL',
      clientService: null, payments: [],
    })

    const result = await clientPaymentService.register(baseInput(200))

    const updateCall = mockPrisma.receivable.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('PARTIAL')
    expect(result.receivable.status).toBe('PARTIAL')
  })

  it('pago crea Transaction INCOME automáticamente', async () => {
    mockPrisma.receivable.findFirstOrThrow.mockResolvedValue(makeReceivable(300, 0))
    mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-auto' })
    mockPrisma.clientPayment.create.mockResolvedValue({ id: 'pay-1' })
    mockPrisma.receivable.update.mockResolvedValue({
      ...makeReceivable(300, 300), status: 'PAID',
      clientService: null, payments: [],
    })

    await clientPaymentService.register(baseInput(300))

    const txCall = mockPrisma.transaction.create.mock.calls[0][0].data
    expect(txCall.type).toBe('INCOME')
    expect(txCall.status).toBe('COMPLETED')
    expect(Number(txCall.amount)).toBe(300)
  })

  it('no permite sobrepago', async () => {
    mockPrisma.receivable.findFirstOrThrow.mockResolvedValue(makeReceivable(300, 200))

    await expect(clientPaymentService.register(baseInput(200))).rejects.toThrow(/supera/)
  })

  it('rechaza monto <= 0', async () => {
    mockPrisma.receivable.findFirstOrThrow.mockResolvedValue(makeReceivable(300, 0))

    await expect(clientPaymentService.register(baseInput(0))).rejects.toThrow(/mayor a 0/)
  })

  it('workspace isolation: no puede registrar pago en receivable de otro workspace', async () => {
    mockPrisma.receivable.findFirstOrThrow.mockRejectedValue(
      new Error('Record not found')
    )

    await expect(
      clientPaymentService.register({ ...baseInput(100), workspaceId: 'ws-otro' })
    ).rejects.toThrow()
  })
})
