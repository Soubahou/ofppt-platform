import { Router } from 'express'
import logger from '../utils/logger.js'

const router = Router()

const checkService = async (name, baseUrl, healthPath = '/api/health') => {
  const start = Date.now()
  try {
    const res = await fetch(`${baseUrl}${healthPath}`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
      ? { status: 'ok',    latency_ms: Date.now() - start }
      : { status: 'error', code: res.status }
  } catch (err) {
    logger.warn({ name, err: err.message }, 'Health check failed')
    return { status: 'down', error: err.message }
  }
}

router.get('/', async (_req, res) => {
  const [authResult, academicResult, documentResult] = await Promise.all([
    checkService('auth-service',     process.env.AUTH_SERVICE_URL,     '/health'),
    checkService('academic-service', process.env.ACADEMIC_SERVICE_URL, '/api/health'),
    checkService('document-service', process.env.DOCUMENT_SERVICE_URL, '/api/health'),
  ])

  const services = {
    'auth-service':     authResult,
    'academic-service': academicResult,
    'document-service': documentResult,
  }

  const statuses  = Object.values(services).map((s) => s.status)
  const allOk     = statuses.every((s) => s === 'ok')
  const allDown   = statuses.every((s) => s !== 'ok')
  const overallStatus = allOk ? 'ok' : allDown ? 'down' : 'degraded'

  res.status(allDown ? 503 : 200).json({
    status:   overallStatus,
    gateway:  'ok',
    services,
  })
})

export default router
