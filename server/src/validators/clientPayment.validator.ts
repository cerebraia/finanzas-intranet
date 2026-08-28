import { z } from 'zod'

export const registerPaymentSchema = z.object({
  workspaceId:  z.string().min(1),
  clientId:     z.string().min(1),
  accountId:    z.string().min(1),
  amount:       z.number().positive('El monto debe ser mayor a 0'),
  paymentDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  reference:    z.string().max(100).optional(),
  notes:        z.string().max(500).optional(),
})
