import type { Request, Response, NextFunction } from 'express'
import { workspaceService } from '../services/workspace.service.js'

export const workspaceController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaces = await workspaceService.findAll()
      res.json(workspaces)
    } catch (err) { next(err) }
  },
}
