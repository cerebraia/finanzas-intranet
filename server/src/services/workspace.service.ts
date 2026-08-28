import { prisma } from '../lib/prisma.js'

export const workspaceService = {
  async findAll() {
    return prisma.workspace.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  },

  async findById(id: string) {
    return prisma.workspace.findUnique({ where: { id } })
  },

  async findBySlug(slug: string) {
    return prisma.workspace.findUnique({ where: { slug } })
  },
}
