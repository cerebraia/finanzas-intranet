import { Router } from 'express'
import { recurringExpenseController, pendingItemsController } from '../controllers/employee.controller.js'
import { validateBody } from '../middlewares/validateRequest.js'
import { createRecurringExpenseSchema, payRecurringExpenseSchema } from '../validators/recurringExpense.validator.js'

const router = Router()
// Recurring expenses
router.get('/',       recurringExpenseController.list)
router.post('/',      validateBody(createRecurringExpenseSchema), recurringExpenseController.create)
router.patch('/:id',  recurringExpenseController.update)
router.post('/:id/pay', validateBody(payRecurringExpenseSchema), recurringExpenseController.pay)
router.post('/generate', recurringExpenseController.generate)
export default router
