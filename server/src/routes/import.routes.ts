import { Router, type Request, type Response, type NextFunction } from 'express'
import { importService } from '../services/import.service.js'

const router = Router()

// POST /api/import/preview — multipart/form-data with 'file'
// Uses raw body parsing for demo; in production use multer
router.post('/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, fileBase64, fileName } = req.body as {
      workspaceId: string
      fileBase64:  string
      fileName:    string
    }
    if (!fileBase64 || !workspaceId) {
      res.status(400).json({ error: 'fileBase64 y workspaceId son requeridos' })
      return
    }
    const buffer  = Buffer.from(fileBase64, 'base64')
    const preview = await importService.parseAndPreview(buffer, fileName ?? 'import.xlsx', workspaceId)
    res.json(preview)
  } catch (err) { next(err) }
})

// POST /api/import/execute — execute the import
router.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { preview, workspaceId, accountId, categoryId, skipReview, createdById } = req.body as {
      preview:     import('../services/import.service.js').ImportPreview
      workspaceId: string
      accountId:   string
      categoryId:  string
      skipReview:  boolean
      createdById?: string
    }
    const result = await importService.executeImport(preview, workspaceId, { accountId, categoryId, skipReview, createdById })
    res.json(result)
  } catch (err) { next(err) }
})

// GET /api/import/batches — list import history
router.get('/batches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query as { workspaceId: string }
    res.json(await importService.listBatches(workspaceId))
  } catch (err) { next(err) }
})

export default router
