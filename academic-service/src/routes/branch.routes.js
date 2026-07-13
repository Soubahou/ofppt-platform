import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as branchController from '../controllers/branch.controller.js'
import { authenticate }       from '../middleware/authenticate.js'
import { authorize }          from '../middleware/authorize.js'
import { validate }           from '../middleware/validate.js'
import { createBranchSchema, updateBranchSchema } from '../utils/schemas.js'

const router = Router()

const writeLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60,
  message:         { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

router.use(authenticate)

router.get('/', branchController.getAll)
router.get('/:id', branchController.getById)

router.post('/',    writeLimiter, authorize('create', 'schedule'), validate(createBranchSchema), branchController.create)
router.put('/:id',  writeLimiter, authorize('update', 'schedule'), validate(updateBranchSchema), branchController.update)
router.delete('/:id', writeLimiter, authorize('delete', 'schedule'), branchController.remove)

export default router
