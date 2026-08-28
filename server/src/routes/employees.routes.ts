import { Router } from 'express'
import { employeeController } from '../controllers/employee.controller.js'
import { validateBody } from '../middlewares/validateRequest.js'
import { createEmployeeSchema, updateEmployeeSchema, addPayrollRuleSchema } from '../validators/employee.validator.js'

const router = Router()
router.get('/',    employeeController.list)
router.post('/',   validateBody(createEmployeeSchema), employeeController.create)
router.get('/:id', employeeController.get)
router.patch('/:id', validateBody(updateEmployeeSchema), employeeController.update)
router.post('/:id/payroll-rules', validateBody(addPayrollRuleSchema), employeeController.addPayrollRule)
router.get('/:id/obligations', employeeController.listObligations)
router.get('/:id/payments',    employeeController.listPayments)
export default router
