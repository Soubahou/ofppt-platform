import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as groupController from '../controllers/group.controller.js'
import { authenticate }      from '../middleware/authenticate.js'
import { authorize }         from '../middleware/authorize.js'
import { validate }          from '../middleware/validate.js'
import { createGroupSchema, updateGroupSchema } from '../utils/schemas.js'

const router = Router()

const writeLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60,
  message:         { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

router.use(authenticate)

router.get('/',                    authorize('read',   'group'), groupController.getAll)
router.get('/:id',                 authorize('read',   'group'), groupController.getById)
router.get('/:id/students',        authorize('read',   'group'), groupController.getStudents)
router.post('/',        writeLimiter, authorize('create', 'group'), validate(createGroupSchema), groupController.create)
router.put('/:id',      writeLimiter, authorize('update', 'group'), validate(updateGroupSchema), groupController.update)
router.delete('/:id',   writeLimiter, authorize('delete', 'group'), groupController.remove)

export default router
