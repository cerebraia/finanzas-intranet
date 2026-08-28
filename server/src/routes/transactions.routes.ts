import { Router } from 'express'
import { transactionController } from '../controllers/transaction.controller.js'
import { validateBody, validateQuery } from '../middlewares/validateRequest.js'
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
} from '../validators/transaction.validator.js'

const router = Router()
router.get('/',           validateQuery(listTransactionsQuerySchema), transactionController.list)
router.get('/:id',        transactionController.get)
router.post('/',          validateBody(createTransactionSchema),  transactionController.create)
router.patch('/:id',      validateBody(updateTransactionSchema),  transactionController.update)
router.patch('/:id/cancel', transactionController.cancel)
router.delete('/:id',     transactionController.remove)
export default router
