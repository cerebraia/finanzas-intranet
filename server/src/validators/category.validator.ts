import { z } from 'zod'

export const createCategorySchema = z.object({
  workspaceId: z.string().optional(),
  name:        z.string().min(1).max(100),
  type:        z.enum(['INCOME','EXPENSE']),
  icon:        z.string().optional(),
  color:       z.string().optional(),
})
