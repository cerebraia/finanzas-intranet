import { Router } from 'express'
import { businessController } from '../controllers/client.controller.js'

const router = Router()
router.get('/dashboard',            businessController.dashboard)
router.get('/pending-receivables',  businessController.pendingReceivables)
router.post('/generate-receivables', businessController.generateReceivables)
export default router
