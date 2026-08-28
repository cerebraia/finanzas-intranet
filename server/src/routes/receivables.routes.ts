import { Router } from 'express'
import { receivableController } from '../controllers/client.controller.js'
import { validateBody } from '../middlewares/validateRequest.js'
import { registerPaymentSchema } from '../validators/clientPayment.validator.js'

const router = Router()
router.get('/', receivableController.list)
router.post('/:id/payments', validateBody(registerPaymentSchema), receivableController.registerPayment)
export default router
