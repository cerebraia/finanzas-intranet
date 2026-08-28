import { Router } from 'express'
import {
  clientController,
  serviceCatalogController,
} from '../controllers/client.controller.js'
import { validateBody } from '../middlewares/validateRequest.js'
import {
  createClientSchema,
  updateClientSchema,
  createClientServiceSchema,
  updateClientServiceSchema,
} from '../validators/client.validator.js'

const router = Router()

// ── Service catalog ──────────────────────────────────────────────────────────
router.get('/services',  serviceCatalogController.list)
router.post('/services', serviceCatalogController.create)

// ── Clients CRUD ──────────────────────────────────────────────────────────────
router.get('/',    clientController.list)
router.post('/',   validateBody(createClientSchema), clientController.create)
router.get('/:id', clientController.get)
router.patch('/:id', validateBody(updateClientSchema), clientController.update)

// ── Client sub-resources ──────────────────────────────────────────────────────
router.get('/:id/services',                             clientController.listServices)
router.post('/:id/services', validateBody(createClientServiceSchema), clientController.addService)
router.patch('/:id/services/:serviceId', validateBody(updateClientServiceSchema), clientController.updateService)

router.get('/:id/receivables',  clientController.listReceivables)
router.get('/:id/payments',     clientController.listPayments)
router.get('/:id/profitability', clientController.profitability)

export default router
