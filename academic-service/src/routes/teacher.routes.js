import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as teacherController from '../controllers/teacher.controller.js'
import { authenticate }        from '../middleware/authenticate.js'
import { authorize }           from '../middleware/authorize.js'
import { validate }            from '../middleware/validate.js'
import { createTeacherSchema, updateTeacherSchema } from '../utils/schemas.js'

const router = Router()

const writeLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60,
  message:         { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

router.use(authenticate)

router.get('/',              authorize('read',   'user'),     teacherController.getAll)
router.get('/:id',           authorize('read',   'user'),     teacherController.getById)
router.get('/:id/schedule',  authorize('read',   'schedule'), teacherController.getSchedule)
router.post('/',   writeLimiter, authorize('create', 'user'), validate(createTeacherSchema), teacherController.create)
router.put('/:id', writeLimiter, authorize('update', 'user'), validate(updateTeacherSchema), teacherController.update)
router.delete('/:id', writeLimiter, authorize('delete', 'user'), teacherController.remove)

export default router
