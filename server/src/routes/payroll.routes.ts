import { Router } from 'express'
import { payrollController } from '../controllers/employee.controller.js'
import { validateBody } from '../middlewares/validateRequest.js'
import { registerPayrollPaymentSchema } from '../validators/payroll.validator.js'

const router = Router()
router.get('/obligations',                          payrollController.listObligations)
router.post('/obligations/:id/payments', validateBody(registerPayrollPaymentSchema), payrollController.registerPayment)
router.delete('/payments/:id',                      payrollController.cancelPayment)
router.post('/generate',                            payrollController.generate)
router.get('/summary',                              payrollController.summary)
export default router
