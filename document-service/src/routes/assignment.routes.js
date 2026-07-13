import { Router }         from 'express'
import { authenticate }   from '../middleware/authenticate.js'
import { authorize }      from '../middleware/authorize.js'
import { validate }       from '../middleware/validate.js'
import {
  createAssignmentSchema,
  updateAssignmentSchema,
} from '../utils/schemas.js'
import * as assignmentController from '../controllers/assignment.controller.js'

const router = Router()

router.get('/',
  authenticate,
  authorize('read', 'document'),
  assignmentController.list,
)

router.post('/',
  authenticate,
  authorize('assign', 'document'),
  validate(createAssignmentSchema),
  assignmentController.create,
)

router.get('/:id',
  authenticate,
  authorize('read', 'document'),
  assignmentController.getById,
)

router.put('/:id',
  authenticate,
  authorize('assign', 'document'),
  validate(updateAssignmentSchema),
  assignmentController.update,
)

router.delete('/:id',
  authenticate,
  authorize('assign', 'document'),
  assignmentController.remove,
)

router.get('/:id/submissions',
  authenticate,
  authorize('read', 'document'),
  assignmentController.listSubmissions,
)

export default router
