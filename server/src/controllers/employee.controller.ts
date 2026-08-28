import type { Request, Response, NextFunction } from 'express'
import { employeeService }       from '../services/employee.service.js'
import { payrollPaymentService } from '../services/payrollPayment.service.js'
import { prisma }                from '../lib/prisma.js'

async function getPayrollCategoryId(workspaceId: string): Promise<string> {
  const cat = await prisma.category.findFirst({
    where: {
      type: 'EXPENSE', isActive: true,
      OR:   [{ workspaceId: null }, { workspaceId }],
      name: { contains: 'Nómina', mode: 'insensitive' },
    },
  })
  if (cat) return cat.id
  const fallback = await prisma.category.findFirstOrThrow({
    where: { type: 'EXPENSE', isActive: true, OR: [{ workspaceId: null }, { workspaceId }] },
  })
  return fallback.id
}

export const employeeController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await employeeService.findAll(workspaceId))
    } catch (err) { next(err) }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await employeeService.findById(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await employeeService.create(req.body))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await employeeService.update(req.params.id, workspaceId, req.body))
    } catch (err) { next(err) }
  },

  async addPayrollRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.status(201).json(await employeeService.addPayrollRule(req.params.id, workspaceId, req.body))
    } catch (err) { next(err) }
  },

  async listObligations(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await payrollPaymentService.findByEmployee(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await employeeService.findPayments(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },
}

export const payrollController = {
  async listObligations(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as { workspaceId: string; from?: string; to?: string; status?: string; employeeId?: string }
      res.json(await payrollPaymentService.findObligations(q.workspaceId, q))
    } catch (err) { next(err) }
  },

  async registerPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = await getPayrollCategoryId(req.body.workspaceId)
      res.status(201).json(
        await payrollPaymentService.register({ ...req.body, payrollCategoryId: categoryId })
      )
    } catch (err) { next(err) }
  },

  async cancelPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await payrollPaymentService.cancel(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, month, year } = req.body as { workspaceId: string; month: number; year: number }
      const { payrollGenerationService } = await import('../services/payrollGeneration.service.js')
      res.json(await payrollGenerationService.generateMonthlyPayroll(workspaceId, month, year))
    } catch (err) { next(err) }
  },

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, from, to } = req.query as { workspaceId: string; from?: string; to?: string }
      const now = new Date()
      const f   = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
      const t   = to   ? new Date(to)   : new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const { payrollAnalyticsService } = await import('../services/payrollAnalytics.service.js')
      res.json(await payrollAnalyticsService.getSummary({ workspaceId, from: f, to: t }))
    } catch (err) { next(err) }
  },
}

export const recurringExpenseController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await (await import('../services/recurringExpense.service.js')).recurringExpenseService.findAll(workspaceId))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await (await import('../services/recurringExpense.service.js')).recurringExpenseService.create(req.body))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await (await import('../services/recurringExpense.service.js')).recurringExpenseService.update(req.params.id, workspaceId, req.body))
    } catch (err) { next(err) }
  },

  async pay(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await (await import('../services/recurringExpense.service.js')).recurringExpenseService.pay(req.params.id, workspaceId, req.body))
    } catch (err) { next(err) }
  },

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, month, year } = req.body as { workspaceId: string; month: number; year: number }
      res.json(await (await import('../services/recurringExpense.service.js')).recurringExpenseService.generateMonthlyObligations(workspaceId, month, year))
    } catch (err) { next(err) }
  },
}

export const pendingItemsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, limit, types } = req.query as { workspaceId: string; limit?: string; types?: string }
      const { pendingItemsService } = await import('../services/pendingItems.service.js')
      const typeList = types ? types.split(',') as ('RECEIVABLE' | 'PAYROLL' | 'RECURRING_EXPENSE')[] : undefined
      res.json(await pendingItemsService.getAll({
        workspaceId,
        limit: limit ? parseInt(limit, 10) : undefined,
        types: typeList,
      }))
    } catch (err) { next(err) }
  },
}
