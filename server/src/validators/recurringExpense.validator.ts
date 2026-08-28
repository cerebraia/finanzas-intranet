import { z } from 'zod'

export const createRecurringExpenseSchema = z.object({
  workspaceId: z.string().min(1),
  name:        z.string().min(1).max(150),
  amount:      z.number().positive(),
  categoryId:  z.string().min(1),
  frequency:   z.enum(['WEEKLY','BIWEEKLY','MONTHLY','ONE_TIME','CUSTOM']).default('MONTHLY'),
  paymentDay:  z.number().int().min(1).max(31),
  accountId:   z.string().optional(),
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:       z.string().max(500).optional(),
})

export const payRecurringExpenseSchema = z.object({
  month:       z.number().int().min(1).max(12),
  year:        z.number().int().min(2020).max(2100),
  accountId:   z.string().min(1),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference:   z.string().max(100).optional(),
})
