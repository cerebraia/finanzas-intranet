import { prisma } from '../lib/prisma.js'
import type { ReceivableStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * OVERDUE es computado dinámicamente:
 * si dueDate < hoy Y status no es PAID/CANCELLED → OVERDUE
 */
export function computeReceivableStatus(
  status: ReceivableStatus,
  dueDate: Date,
  amountPaid: Decimal,
  amount: Decimal,
): ReceivableStatus {
  if (status === 'PAID' || status === 'CANCELLED') return status
  const isPastDue = new Date(dueDate) < new Date(new Date().toDateString())
  if (isPastDue) return 'OVERDUE'
  if (amountPaid.greaterThan(0)) return 'PARTIAL'
  return 'PENDING'
}

function withComputedStatus<T extends { status: ReceivableStatus; dueDate: Date; amountPaid: Decimal; amount: Decimal }>(r: T) {
  return { ...r, status: computeReceivableStatus(r.status, r.dueDate, r.amountPaid, r.amount) }
}

const includeRelations = {
  client:        { select: { id: true, name: true, companyName: true } },
  clientService: { include: { service: { select: { id: true, name: true } } } },
  payments:      { select: { id: true, amount: true, paymentDate: true, reference: true } },
}

export const receivableService = {
  async findAll(workspaceId: string, params: {
    from?: string; to?: string; clientId?: string; status?: string;
  }) {
    const { from, to, clientId, status } = params
    const rows = await prisma.receivable.findMany({
      where: {
        workspaceId,
        clientId:  clientId ?? undefined,
        dueDate:   { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
        status:    (status && status !== 'OVERDUE') ? (status as ReceivableStatus) : undefined,
      },
      include: includeRelations,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    })
    const result = rows.map(withComputedStatus)
    if (status === 'OVERDUE') return result.filter(r => r.status === 'OVERDUE')
    return result
  },

  async findByClient(clientId: string, workspaceId: string) {
    await prisma.client.findFirstOrThrow({ where: { id: clientId, workspaceId } })
    const rows = await prisma.receivable.findMany({
      where:   { clientId, workspaceId },
      include: includeRelations,
      orderBy: { dueDate: 'desc' },
    })
    return rows.map(withComputedStatus)
  },

  async create(data: {
    workspaceId: string; clientId: string; clientServiceId?: string;
    description: string; amount: number; dueDate: string;
    periodMonth?: number; periodYear?: number; notes?: string;
  }) {
    const row = await prisma.receivable.create({
      data: {
        workspaceId:     data.workspaceId,
        clientId:        data.clientId,
        clientServiceId: data.clientServiceId,
        description:     data.description,
        amount:          data.amount,
        dueDate:         new Date(data.dueDate),
        periodMonth:     data.periodMonth,
        periodYear:      data.periodYear,
        notes:           data.notes,
      },
      include: includeRelations,
    })
    return withComputedStatus(row)
  },
}
