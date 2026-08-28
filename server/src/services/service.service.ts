import { prisma } from '../lib/prisma.js'

interface CreateServiceInput {
  workspaceId: string
  name: string
  description?: string
}

export const serviceService = {
  async findAll(workspaceId: string) {
    return prisma.service.findMany({
      where:   { workspaceId, isActive: true },
      orderBy: { name: 'asc' },
    })
  },

  async create(data: CreateServiceInput) {
    return prisma.service.create({ data })
  },
}
