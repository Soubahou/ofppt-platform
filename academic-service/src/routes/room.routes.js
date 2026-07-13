import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as roomController from '../controllers/room.controller.js'
import { authenticate }    from '../middleware/authenticate.js'
import { authorize }       from '../middleware/authorize.js'
import { validate }        from '../middleware/validate.js'
import { createRoomSchema, updateRoomSchema } from '../utils/schemas.js'

const router = Router()

const writeLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60,
  message:         { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

router.use(authenticate)

router.get('/',      authorize('read',   'schedule'), roomController.getAll)
router.get('/:id',   authorize('read',   'schedule'), roomController.getById)
router.post('/',     writeLimiter, authorize('create', 'schedule'), validate(createRoomSchema), roomController.create)
router.put('/:id',   writeLimiter, authorize('update', 'schedule'), validate(updateRoomSchema), roomController.update)
router.delete('/:id', writeLimiter, authorize('delete', 'schedule'), roomController.remove)

export default router
