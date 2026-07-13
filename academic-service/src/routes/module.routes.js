import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as moduleController from '../controllers/module.controller.js'
import { authenticate }       from '../middleware/authenticate.js'
import { authorize }          from '../middleware/authorize.js'
import { validate }           from '../middleware/validate.js'
import { createModuleSchema, updateModuleSchema, assignTeacherSchema } from '../utils/schemas.js'

const router = Router()

const writeLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60,
  message:         { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

router.use(authenticate)

router.get('/',                         authorize('read',   'module'), moduleController.getAll)
router.get('/:id',                      authorize('read',   'module'), moduleController.getById)
router.get('/:id/teachers',             authorize('read',   'module'), moduleController.getTeachers)
router.post('/',             writeLimiter, authorize('create', 'module'), validate(createModuleSchema), moduleController.create)
router.put('/:id',           writeLimiter, authorize('update', 'module'), validate(updateModuleSchema), moduleController.update)
router.delete('/:id',        writeLimiter, authorize('delete', 'module'), moduleController.remove)
router.post('/:id/teachers', writeLimiter, authorize('update', 'module'), validate(assignTeacherSchema), moduleController.assignTeacher)
router.delete('/:id/teachers/:teacherId', writeLimiter, authorize('update', 'module'), moduleController.unassignTeacher)

export default router
