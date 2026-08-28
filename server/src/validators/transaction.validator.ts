import { z } from 'zod'

export const createTransactionSchema = z.object({
  workspaceId:     z.string().min(1),
  accountId:       z.string().min(1),
  categoryId:      z.string().min(1),
  type:            z.enum(['INCOME','EXPENSE']),
  amount:          z.number().positive('El monto debe ser mayor a 0'),
  description:     z.string().min(1).max(255),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  status:          z.enum(['PENDING','COMPLETED','CANCELLED']).default('COMPLETED'),
  notes:           z.string().max(1000).optional(),
  reference:       z.string().max(100).optional(),
  clientId:        z.string().optional().nullable(),
})

export const updateTransactionSchema = z.object({
  accountId:       z.string().min(1).optional(),
  categoryId:      z.string().min(1).optional(),
  amount:          z.number().positive().optional(),
  description:     z.string().min(1).max(255).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status:          z.enum(['PENDING','COMPLETED','CANCELLED']).optional(),
  notes:           z.string().max(1000).optional().nullable(),
  reference:       z.string().max(100).optional().nullable(),
  clientId:        z.string().optional().nullable(),
})

export const listTransactionsQuerySchema = z.object({
  workspaceId: z.string().min(1),
  from:        z.string().optional(),
  to:          z.string().optional(),
  type:        z.enum(['INCOME','EXPENSE']).optional(),
  categoryId:  z.string().optional(),
  accountId:   z.string().optional(),
  status:      z.enum(['PENDING','COMPLETED','CANCELLED']).optional(),
  q:           z.string().optional(),
})
