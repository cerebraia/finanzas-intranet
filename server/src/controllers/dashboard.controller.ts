import type { Request, Response, NextFunction } from 'express'
import { dashboardService } from '../services/dashboard.service.js'

function monthRange(from?: string, to?: string): { from: Date; to: Date } {
  const now = new Date()
  return {
    from: from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1),
    to:   to   ? new Date(to)  : new Date(now.getFullYear(), now.getMonth() + 1, 0),
  }
}

export const dashboardController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, from, to } = req.query as { workspaceId: string; from?: string; to?: string }
      const range = monthRange(from, to)
      res.json(await dashboardService.getSummary({ workspaceId, ...range }))
    } catch (err) { next(err) }
  },

  async cashFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, year } = req.query as { workspaceId: string; year?: string }
      const y = year ? parseInt(year, 10) : new Date().getFullYear()
      res.json(await dashboardService.getCashFlow(workspaceId, y))
    } catch (err) { next(err) }
  },

  async expenseDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, from, to } = req.query as { workspaceId: string; from?: string; to?: string }
      const range = monthRange(from, to)
      res.json(await dashboardService.getExpenseDistribution({ workspaceId, ...range }))
    } catch (err) { next(err) }
  },
}
