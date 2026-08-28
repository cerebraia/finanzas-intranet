import type { Request, Response, NextFunction } from 'express'
import { accountService } from '../services/account.service.js'

export const accountController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await accountService.findAll(workspaceId))
    } catch (err) { next(err) }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await accountService.findById(req.params.id))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await accountService.create(req.body))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await accountService.update(req.params.id, req.body))
    } catch (err) { next(err) }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await accountService.remove(req.params.id)
      res.status(204).send()
    } catch (err) { next(err) }
  },
}
