import { Router } from 'express'
import { accountController } from '../controllers/account.controller.js'
import { validateBody } from '../middlewares/validateRequest.js'
import { createAccountSchema, updateAccountSchema } from '../validators/account.validator.js'

const router = Router()
router.get('/',     accountController.list)
router.get('/:id',  accountController.get)
router.post('/',    validateBody(createAccountSchema), accountController.create)
router.patch('/:id', validateBody(updateAccountSchema), accountController.update)
router.delete('/:id', accountController.remove)
export default router
