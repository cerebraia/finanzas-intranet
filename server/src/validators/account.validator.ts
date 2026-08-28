import { z } from 'zod'

export const createAccountSchema = z.object({
  workspaceId:    z.string().min(1),
  name:           z.string().min(1).max(100),
  type:           z.enum(['BANK','CASH','ZELLE','CRYPTO','CREDIT_CARD','OTHER']),
  currency:       z.enum(['USD','VES','EUR']).default('USD'),
  initialBalance: z.number().default(0),
})

export const updateAccountSchema = z.object({
  name:           z.string().min(1).max(100).optional(),
  type:           z.enum(['BANK','CASH','ZELLE','CRYPTO','CREDIT_CARD','OTHER']).optional(),
  currency:       z.enum(['USD','VES','EUR']).optional(),
  initialBalance: z.number().optional(),
  isActive:       z.boolean().optional(),
})
