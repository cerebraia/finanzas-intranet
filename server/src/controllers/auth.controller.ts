import type { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service.js'
import type { AuthRequest } from '../middlewares/auth.middleware.js'

const COOKIE_NAME = 'finanzas_token'
const IS_PROD     = process.env.NODE_ENV === 'production'

const COOKIE_OPTIONS = {
  httpOnly:  true,
  secure:    IS_PROD,
  sameSite: (IS_PROD ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge:    7 * 24 * 60 * 60 * 1000, // 7 días
  path:      '/',
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body as { email: string; password: string }
      if (!email || !password) {
        res.status(400).json({ error: 'Email y contraseña requeridos' })
        return
      }

      const { token, user } = await authService.login(email, password)
      res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
      res.json({ user, token })
    } catch (err) { next(err) }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest
      if (authReq.userId) {
        await import('../lib/prisma.js').then(({ prisma }) =>
          prisma.auditLog.create({
            data: {
              userId:     authReq.userId!,
              action:     'LOGOUT',
              entityType: 'User',
              entityId:   authReq.userId!,
            },
          }).catch(() => null)
        )
      }
      res.clearCookie(COOKIE_NAME, { path: '/' })
      res.json({ ok: true })
    } catch (err) { next(err) }
  },

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getUserById(req.userId!)
      if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return }
      res.json(user)
    } catch (err) { next(err) }
  },

  async workspaces(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const memberships = await authService.getUserWorkspaces(req.userId!)
      res.json(memberships.map(m => ({
        ...m.workspace,
        role: m.role,
      })))
    } catch (err) { next(err) }
  },
}
