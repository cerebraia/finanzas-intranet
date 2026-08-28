import type { Request, Response, NextFunction } from 'express'
import { categoryService } from '../services/category.service.js'
import type { CategoryType } from '@prisma/client'

export const categoryController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, type } = req.query as { workspaceId?: string; type?: CategoryType }
      res.json(await categoryService.findAll(workspaceId, type))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await categoryService.create(req.body))
    } catch (err) { next(err) }
  },
}
