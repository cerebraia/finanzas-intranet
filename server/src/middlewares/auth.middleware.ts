import type { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service.js'

export interface AuthRequest extends Request {
  userId?:      string
  userEmail?:   string
  workspaceId?: string
}

const COOKIE_NAME = 'finanzas_token'

/**
 * Extrae el JWT desde cookie o Authorization header.
 * Si no hay token, responde 401.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tokenFromCookie = req.cookies?.[COOKIE_NAME]
    const tokenFromHeader = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null
    const token = tokenFromCookie ?? tokenFromHeader

    if (!token) {
      res.status(401).json({ error: 'No autorizado — token requerido' })
      return
    }

    const payload = authService.verifyToken(token)
    req.userId      = payload.userId
    req.userEmail   = payload.email
    req.workspaceId = payload.workspaceId
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

/**
 * Verifica que el userId del token tenga acceso al workspaceId
 * recibido en query params o body.
 * Debe ejecutarse DESPUÉS de requireAuth.
 */
export async function requireWorkspaceAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = (req.query.workspaceId ?? req.body?.workspaceId) as string | undefined
    if (!workspaceId) { next(); return } // si no hay workspaceId en el request, dejar pasar

    const hasAccess = await authService.verifyWorkspaceAccess(req.userId!, workspaceId)
    if (!hasAccess) {
      res.status(403).json({ error: 'No tienes acceso a este workspace' })
      return
    }
    next()
  } catch {
    res.status(500).json({ error: 'Error verificando acceso al workspace' })
  }
}
