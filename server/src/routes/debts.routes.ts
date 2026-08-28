import { Router } from 'express'
import { debtController } from '../controllers/debt.controller.js'

const router = Router()

router.get('/',                             debtController.list)
router.post('/',                            debtController.create)
router.get('/commitment-summary',           debtController.commitmentSummary)
router.get('/:id',                          debtController.get)
router.patch('/:id',                        debtController.update)
router.get('/:id/installments',             debtController.listInstallments)
router.post('/:id/installments/generate',   debtController.generateInstallments)
router.get('/:id/payments',                 debtController.listPayments)
router.post('/installments/:id/payments',   debtController.registerPayment)
router.delete('/payments/:id',              debtController.cancelPayment)

export default router
