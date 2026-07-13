import { Router }   from 'express'
import rateLimit    from 'express-rate-limit'
import * as mtgController   from '../controllers/mtg.controller.js'
import { authenticate }     from '../middleware/authenticate.js'
import { authorize }        from '../middleware/authorize.js'
import { validate }         from '../middleware/validate.js'
import { upsertModuleTeacherGroupSchema } from '../utils/schemas.js'

const router = Router()

const writeLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  message:         { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

router.use(authenticate)

router.get('/', authorize('read', 'module'), mtgController.list)

router.post(
  '/',
  writeLimiter,
  authorize('update', 'module'),
  validate(upsertModuleTeacherGroupSchema),
  mtgController.upsert
)

export default router