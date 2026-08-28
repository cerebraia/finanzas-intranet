import type { Request, Response, NextFunction } from 'express'
import { transactionService } from '../services/transaction.service.js'

export const transactionController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await transactionService.findAll(req.query as Parameters<typeof transactionService.findAll>[0]))
    } catch (err) { next(err) }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await transactionService.findById(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await transactionService.create(req.body))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await transactionService.update(req.params.id, workspaceId, req.body))
    } catch (err) { next(err) }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await transactionService.cancel(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      await transactionService.remove(req.params.id, workspaceId)
      res.status(204).send()
    } catch (err) { next(err) }
  },
}
