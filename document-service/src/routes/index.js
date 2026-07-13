import { Router }        from 'express'
import documentRouter   from './document.routes.js'
import moduleRouter     from './module.routes.js'
import assignmentRouter from './assignment.routes.js'
import submissionRouter from './submission.routes.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'document-service' })
})

router.use('/documents',              documentRouter)
router.use('/modules/:moduleId/documents', moduleRouter)
router.use('/assignments',            assignmentRouter)
router.use('/submissions',            submissionRouter)

export default router
