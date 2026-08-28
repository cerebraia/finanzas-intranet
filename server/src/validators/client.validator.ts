import { z } from 'zod'

export const createClientSchema = z.object({
  workspaceId: z.string().min(1),
  name:        z.string().min(1).max(150),
  companyName: z.string().max(150).optional(),
  email:       z.string().email().optional().or(z.literal('')),
  phone:       z.string().max(30).optional(),
  notes:       z.string().max(1000).optional(),
})

export const updateClientSchema = z.object({
  name:        z.string().min(1).max(150).optional(),
  companyName: z.string().max(150).optional().nullable(),
  email:       z.string().email().optional().nullable().or(z.literal('')),
  phone:       z.string().max(30).optional().nullable(),
  status:      z.enum(['ACTIVE','PAUSED','INACTIVE']).optional(),
  notes:       z.string().max(1000).optional().nullable(),
})

export const createClientServiceSchema = z.object({
  serviceId:        z.string().min(1),
  price:            z.number().positive('El precio debe ser mayor a 0'),
  billingFrequency: z.enum(['MONTHLY','ONE_TIME','CUSTOM']).default('MONTHLY'),
  billingDay:       z.number().int().min(1).max(31),
  startDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:            z.string().max(500).optional(),
})

export const updateClientServiceSchema = z.object({
  price:            z.number().positive().optional(),
  billingFrequency: z.enum(['MONTHLY','ONE_TIME','CUSTOM']).optional(),
  billingDay:       z.number().int().min(1).max(31).optional(),
  startDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status:           z.enum(['ACTIVE','PAUSED','CANCELLED']).optional(),
  notes:            z.string().max(500).optional().nullable(),
})
