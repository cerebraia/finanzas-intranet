import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.flatten().fieldErrors,
    })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un registro con ese valor único' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
  }

  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status ?? 500
    res.status(status).json({ error: err.message })
    return
  }

  res.status(500).json({ error: 'Error interno del servidor' })
}
