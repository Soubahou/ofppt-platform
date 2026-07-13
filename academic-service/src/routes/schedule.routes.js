import { Router }    from 'express'
import rateLimit     from 'express-rate-limit'
import * as ctrl     from '../controllers/schedule.controller.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize }    from '../middleware/authorize.js'
import { validate }     from '../middleware/validate.js'
import {
  createSessionSchema,
  updateSessionSchema,
  generateInstancesSchema,
  patchInstanceSchema,
} from '../utils/schemas.js'

const router = Router()
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  message: { error: 'Too many requests.' },
  standardHeaders: true, legacyHeaders: false,
})

router.use(authenticate)

router.get('/week',            authorize('read',   'schedule'), ctrl.getWeek)
router.patch('/instances/:id', writeLimiter, authorize('update', 'schedule'), validate(patchInstanceSchema), ctrl.patchInstance)

router.get('/',       authorize('read',   'schedule'), ctrl.getAllSessions)
router.get('/:id',    authorize('read',   'schedule'), ctrl.getSessionById)
router.post('/',      writeLimiter, authorize('create', 'schedule'), validate(createSessionSchema), ctrl.createSession)
router.put('/:id',    writeLimiter, authorize('update', 'schedule'), validate(updateSessionSchema), ctrl.updateSession)
router.delete('/:id', writeLimiter, authorize('delete', 'schedule'), ctrl.deleteSession)

router.patch('/:id/place',   writeLimiter, authorize('update', 'schedule'), ctrl.placeSession)
router.patch('/:id/unplace', writeLimiter, authorize('update', 'schedule'), ctrl.unplaceSession)

router.post('/:id/instances', writeLimiter, authorize('create', 'schedule'), validate(generateInstancesSchema), ctrl.generateInstances)
router.post('/generate-week', writeLimiter, authorize('create', 'schedule'), ctrl.generateWeekInstances)

export default router
