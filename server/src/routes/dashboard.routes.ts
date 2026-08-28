import { Router } from 'express'
import { dashboardController } from '../controllers/dashboard.controller.js'

const router = Router()
router.get('/summary',              dashboardController.summary)
router.get('/cash-flow',            dashboardController.cashFlow)
router.get('/expense-distribution', dashboardController.expenseDistribution)
export default router
