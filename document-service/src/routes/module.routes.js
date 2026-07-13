import { Router }       from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize }    from '../middleware/authorize.js'
import { validate }     from '../middleware/validate.js'
import { linkDocumentSchema } from '../utils/schemas.js'
import * as documentController from '../controllers/document.controller.js'

const router = Router({ mergeParams: true })

router.get('/',
  authenticate,
  authorize('read', 'document'),
  documentController.listByModule,
)

router.post('/',
  authenticate,
  authorize('create', 'document'),
  validate(linkDocumentSchema),
  documentController.linkToModule,
)

router.delete('/:documentId',
  authenticate,
  authorize('delete', 'document'),
  documentController.unlinkFromModule,
)

export default router
