import { Router } from 'express'
import { pendingItemsController } from '../controllers/employee.controller.js'

const router = Router()
router.get('/', pendingItemsController.list)
export default router
