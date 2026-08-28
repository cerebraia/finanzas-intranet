import { prisma } from '../lib/prisma.js'
import type { CategoryType } from '@prisma/client'

interface CreateCategoryInput {
  workspaceId?: string
  name: string
  type: CategoryType
  icon?: string
  color?: string
}

export const categoryService = {
  async findAll(workspaceId?: string, type?: CategoryType) {
    return prisma.category.findMany({
      where: {
        isActive: true,
        type: type ?? undefined,
        OR: [
          { workspaceId: null },
          { workspaceId: workspaceId ?? undefined },
        ],
      },
      orderBy: { name: 'asc' },
    })
  },

  async create(data: CreateCategoryInput) {
    return prisma.category.create({ data })
  },
}
