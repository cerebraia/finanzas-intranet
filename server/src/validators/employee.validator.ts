import { z } from 'zod'

export const createEmployeeSchema = z.object({
  workspaceId: z.string().min(1),
  name:        z.string().min(1).max(150),
  email:       z.string().email().optional().or(z.literal('')),
  phone:       z.string().max(30).optional(),
  role:        z.string().max(100).optional(),
  notes:       z.string().max(1000).optional(),
})

export const updateEmployeeSchema = z.object({
  name:   z.string().min(1).max(150).optional(),
  email:  z.string().email().optional().nullable(),
  phone:  z.string().max(30).optional().nullable(),
  role:   z.string().max(100).optional().nullable(),
  status: z.enum(['ACTIVE','PAUSED','INACTIVE']).optional(),
  notes:  z.string().max(1000).optional().nullable(),
})

export const addPayrollRuleSchema = z.object({
  amount:          z.number().positive('El monto debe ser mayor a 0'),
  currency:        z.enum(['USD','VES','EUR']).default('USD'),
  frequency:       z.enum(['MONTHLY','BIWEEKLY','WEEKLY','ONE_TIME','CUSTOM']).default('MONTHLY'),
  paymentDay:      z.number().int().min(1).max(31),
  secondPaymentDay: z.number().int().min(1).max(31).optional(),
  startDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:           z.string().max(500).optional(),
})
