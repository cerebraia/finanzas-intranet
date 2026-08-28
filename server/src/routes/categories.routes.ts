import { Router } from 'express'
import { categoryController } from '../controllers/category.controller.js'
import { validateBody } from '../middlewares/validateRequest.js'
import { createCategorySchema } from '../validators/category.validator.js'

const router = Router()
router.get('/',  categoryController.list)
router.post('/', validateBody(createCategorySchema), categoryController.create)
export default router
