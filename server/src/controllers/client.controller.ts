import type { Request, Response, NextFunction } from 'express'
import { clientService }        from '../services/client.service.js'
import { clientServiceService } from '../services/clientService.service.js'
import { serviceService }       from '../services/service.service.js'
import { receivableService }    from '../services/receivable.service.js'
import { clientPaymentService } from '../services/clientPayment.service.js'
import { businessAnalyticsService } from '../services/businessAnalytics.service.js'
import { prisma }               from '../lib/prisma.js'

/** Busca la categoría "Clientes" del workspace (o la primera INCOME disponible) */
async function getClientsCategoryId(workspaceId: string): Promise<string> {
  const cat = await prisma.category.findFirst({
    where: {
      type:     'INCOME',
      isActive: true,
      OR: [{ workspaceId: null }, { workspaceId }],
      name:     { contains: 'Cliente', mode: 'insensitive' },
    },
  })
  if (cat) return cat.id
  const fallback = await prisma.category.findFirstOrThrow({
    where: { type: 'INCOME', isActive: true, OR: [{ workspaceId: null }, { workspaceId }] },
  })
  return fallback.id
}

export const clientController = {
  // ── Clients ──────────────────────────────────────────────────────────────
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await clientService.findAll(workspaceId))
    } catch (err) { next(err) }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await clientService.findById(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await clientService.create(req.body))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await clientService.update(req.params.id, workspaceId, req.body))
    } catch (err) { next(err) }
  },

  // ── Client Services ───────────────────────────────────────────────────────
  async listServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await clientServiceService.findByClient(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  async addService(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.status(201).json(await clientServiceService.create(req.params.id, workspaceId, req.body))
    } catch (err) { next(err) }
  },

  async updateService(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await clientServiceService.update(req.params.serviceId, req.params.id, workspaceId, req.body))
    } catch (err) { next(err) }
  },

  // ── Client Receivables ────────────────────────────────────────────────────
  async listReceivables(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await receivableService.findByClient(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  // ── Client Payments ───────────────────────────────────────────────────────
  async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await clientPaymentService.findByClient(req.params.id, workspaceId))
    } catch (err) { next(err) }
  },

  // ── Profitability ─────────────────────────────────────────────────────────
  async profitability(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, from, to } = req.query as { workspaceId: string; from?: string; to?: string }
      res.json(await businessAnalyticsService.getClientProfitability(
        req.params.id, workspaceId,
        from ? new Date(from) : undefined,
        to   ? new Date(to)   : undefined,
      ))
    } catch (err) { next(err) }
  },
}

// ── Service Catalog Controller ────────────────────────────────────────────────
export const serviceCatalogController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.query as { workspaceId: string }
      res.json(await serviceService.findAll(workspaceId))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await serviceService.create(req.body))
    } catch (err) { next(err) }
  },
}

// ── Receivable + Payment Controller ──────────────────────────────────────────
export const receivableController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, from, to, clientId, status } = req.query as Record<string, string>
      res.json(await receivableService.findAll(workspaceId, { from, to, clientId, status }))
    } catch (err) { next(err) }
  },

  async registerPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = await getClientsCategoryId(req.body.workspaceId)
      res.status(201).json(
        await clientPaymentService.register({ ...req.body, clientsCategoryId: categoryId })
      )
    } catch (err) { next(err) }
  },
}

// ── Business Analytics Controller ─────────────────────────────────────────────
export const businessController = {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, from, to } = req.query as { workspaceId: string; from?: string; to?: string }
      const now = new Date()
      const f   = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
      const t   = to   ? new Date(to)   : new Date(now.getFullYear(), now.getMonth() + 1, 0)
      res.json(await businessAnalyticsService.getBusinessSummary({ workspaceId, from: f, to: t }))
    } catch (err) { next(err) }
  },

  async pendingReceivables(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, limit } = req.query as { workspaceId: string; limit?: string }
      res.json(await businessAnalyticsService.getPendingReceivables(workspaceId, limit ? Number(limit) : 5))
    } catch (err) { next(err) }
  },

  async generateReceivables(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, month, year } = req.body as { workspaceId: string; month: number; year: number }
      const { billingService } = await import('../services/billing.service.js')
      res.json(await billingService.generateMonthlyReceivables(workspaceId, month, year))
    } catch (err) { next(err) }
  },
}
