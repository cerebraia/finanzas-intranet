import { Router } from 'express'
import { workspaceController } from '../controllers/workspace.controller.js'

const router = Router()
router.get('/', workspaceController.list)
export default router
