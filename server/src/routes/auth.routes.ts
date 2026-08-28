import { Router } from 'express'
import { authController } from '../controllers/auth.controller.js'
import { requireAuth }    from '../middlewares/auth.middleware.js'

const router = Router()

router.post('/login',     authController.login)
router.post('/logout',    requireAuth, authController.logout)
router.get('/me',         requireAuth, authController.me)
router.get('/workspaces', requireAuth, authController.workspaces)

export default router
