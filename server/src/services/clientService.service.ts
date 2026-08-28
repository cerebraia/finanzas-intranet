import { prisma } from '../lib/prisma.js'
import type { BillingFrequency, ClientServiceStatus } from '@prisma/client'

interface CreateClientServiceInput {
  serviceId: string
  price: number
  billingFrequency?: BillingFrequency
  billingDay: number
  startDate: string
  endDate?: string
  notes?: string
}

interface UpdateClientServiceInput {
  price?: number
  billingFrequency?: BillingFrequency
  billingDay?: number
  startDate?: string
  endDate?: string
  status?: ClientServiceStatus
  notes?: string
}

const includeService = {
  service: { select: { id: true, name: true, description: true } },
}

export const clientServiceService = {
  async findByClient(clientId: string, workspaceId: string) {
    await prisma.client.findFirstOrThrow({ where: { id: clientId, workspaceId } })
    return prisma.clientService.findMany({
      where:   { clientId, status: { not: 'CANCELLED' } },
      include: includeService,
      orderBy: { createdAt: 'asc' },
    })
  },

  async create(clientId: string, workspaceId: string, data: CreateClientServiceInput) {
    await prisma.client.findFirstOrThrow({ where: { id: clientId, workspaceId } })
    return prisma.clientService.create({
      data: {
        clientId,
        serviceId:        data.serviceId,
        price:            data.price,
        billingFrequency: data.billingFrequency ?? 'MONTHLY',
        billingDay:       data.billingDay,
        startDate:        new Date(data.startDate),
        endDate:          data.endDate ? new Date(data.endDate) : undefined,
        notes:            data.notes,
      },
      include: includeService,
    })
  },

  async update(id: string, clientId: string, workspaceId: string, data: UpdateClientServiceInput) {
    await prisma.client.findFirstOrThrow({ where: { id: clientId, workspaceId } })
    await prisma.clientService.findFirstOrThrow({ where: { id, clientId } })
    return prisma.clientService.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate:   data.endDate   ? new Date(data.endDate)   : undefined,
      },
      include: includeService,
    })
  },
}
