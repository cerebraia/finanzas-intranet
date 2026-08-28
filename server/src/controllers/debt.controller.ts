import type { Request, Response, NextFunction } from 'express'
import { debtService }        from '../services/debt.service.js'
import { debtPaymentService } from '../services/debtPayment.service.js'
import { prisma }             from '../lib/prisma.js'

async function getDebtCategoryId(workspaceId: string): Promise<string> {
  const keywords = ['Deuda', 'Cuota', 'Cashea', 'Préstamo', 'Otros gastos']
  for (const kw of keywords) {
    const cat = await prisma.category.findFirst({
      where: {
        type: 'EXPENSE', isActive: true,
        name: { contains: kw, mode: 'insensitive' },
        OR:   [{ workspaceId: null }, { workspaceId }],
      },
    })
    if (cat) return cat.id
  }
  const fallback = await prisma.category.findFirstOrThrow({
    where: { type: 'EXPENSE', isActive: true, OR: [{ workspaceId: null }, { workspaceId }] },
  })
  return fallback.id
}

export const debtController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, type } = req.query as { workspaceId: string; type?: string }
      res.json(await debtService.findAll(workspaceId, type))
    } catch (err) { next(err) }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await debtService.findById(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await debtService.create(req.body))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await debtService.update(req.params.id, workspaceId, req.body))
    } catch (err) { next(err) }
  },

  async listInstallments(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await debtService.findInstallments(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async generateInstallments(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await debtService.generateInstallments(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async registerPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.body as { workspaceId: string }
      const categoryId = await getDebtCategoryId(workspaceId)
      res.status(201).json(
        await debtPaymentService.register({ ...req.body, categoryId })
      )
    } catch (err) { next(err) }
  },

  async cancelPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await debtPaymentService.cancel(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await debtPaymentService.findByDebt(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async commitmentSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      const { financialCommitmentService } = await import('../services/financialCommitment.service.js')
      res.json(await financialCommitmentService.getSummary(workspaceId))
    } catch (err) { next(err) }
  },
}
