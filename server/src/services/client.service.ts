import { prisma } from '../lib/prisma.js'
import type { ClientStatus } from '@prisma/client'

interface CreateClientInput {
  workspaceId: string
  name: string
  companyName?: string
  email?: string
  phone?: string
  notes?: string
}

interface UpdateClientInput {
  name?: string
  companyName?: string
  email?: string
  phone?: string
  status?: ClientStatus
  notes?: string
}

const includeClientDetail = {
  clientServices: {
    where: { status: { not: 'CANCELLED' as const } },
    include: { service: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
}

export const clientService = {
  async findAll(workspaceId: string) {
    const clients = await prisma.client.findMany({
      where:   { workspaceId, status: { not: 'INACTIVE' } },
      include: includeClientDetail,
      orderBy: { name: 'asc' },
    })
    return clients
  },

  async findById(id: string, workspaceId: string) {
    return prisma.client.findFirstOrThrow({
      where:   { id, workspaceId },
      include: includeClientDetail,
    })
  },

  async create(data: CreateClientInput) {
    return prisma.client.create({ data, include: includeClientDetail })
  },

  async update(id: string, workspaceId: string, data: UpdateClientInput) {
    await prisma.client.findFirstOrThrow({ where: { id, workspaceId } })
    return prisma.client.update({ where: { id }, data, include: includeClientDetail })
  },

  async deactivate(id: string, workspaceId: string) {
    await prisma.client.findFirstOrThrow({ where: { id, workspaceId } })
    return prisma.client.update({ where: { id }, data: { status: 'INACTIVE' } })
  },
}
