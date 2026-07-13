import { Router }         from 'express'
import { authenticate }   from '../middleware/authenticate.js'
import { authorize }      from '../middleware/authorize.js'
import { validate }       from '../middleware/validate.js'
import { documentUpload } from '../middleware/upload.js'
import {
  createDocumentSchema,
  updateDocumentSchema,
  linkDocumentSchema,
} from '../utils/schemas.js'
import * as documentController from '../controllers/document.controller.js'

const router = Router()

router.get('/',
  authenticate,
  authorize('read', 'document'),
  documentController.list,
)

router.post('/',
  authenticate,
  authorize('create', 'document'),
  documentUpload.single('file'),
  validate(createDocumentSchema),
  documentController.create,
)

router.get('/:id',
  authenticate,
  authorize('read', 'document'),
  documentController.getById,
)

router.put('/:id',
  authenticate,
  authorize('update', 'document'),
  validate(updateDocumentSchema),
  documentController.update,
)

router.delete('/:id',
  authenticate,
  authorize('delete', 'document'),
  documentController.remove,
)

router.get('/:id/download',
  authenticate,
  authorize('read', 'document'),
  documentController.download,
)

export default router
