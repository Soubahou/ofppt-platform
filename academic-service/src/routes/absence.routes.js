import { Router }           from 'express'
import rateLimit            from 'express-rate-limit'
import { authenticate }     from '../middleware/authenticate.js'
import { authorize }        from '../middleware/authorize.js'
import { validate }         from '../middleware/validate.js'
import * as absenceCtrl     from '../controllers/absence.controller.js'
import {
  createAbsenceSchema,
  updateAbsenceSchema,
  justifyAbsenceSchema,
} from '../utils/schemas.js'

const router = Router()

const writeLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many requests, slow down.' },
})

router.use(authenticate)

router.get('/', authorize('read', 'absence'), absenceCtrl.listAbsences)
router.get('/stats', authorize('read', 'absence'), absenceCtrl.getStats)
router.get('/:id', authorize('read', 'absence'), absenceCtrl.getAbsenceById)

router.post(
  '/',
  writeLimiter,
  authorize('create', 'absence'),
  validate(createAbsenceSchema),
  absenceCtrl.createAbsence,
)

router.put(
  '/:id',
  writeLimiter,
  authorize('update', 'absence'),
  validate(updateAbsenceSchema),
  absenceCtrl.updateAbsence,
)

router.patch(
  '/:id/justify',
  writeLimiter,
  authorize('justify', 'absence'),
  validate(justifyAbsenceSchema),
  absenceCtrl.justifyAbsence,
)

router.patch(
  '/:id/approve',
  writeLimiter,
  authorize('approve', 'absence'),
  absenceCtrl.approveAbsence,
)

router.patch(
  '/:id/reject',
  writeLimiter,
  authorize('approve', 'absence'),  
  absenceCtrl.rejectAbsence,
)

router.delete(
  '/:id',
  writeLimiter,
  authorize('delete', 'absence'),
  absenceCtrl.deleteAbsence,
)

export default router
