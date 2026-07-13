import 'dotenv/config'
import express   from 'express'
import helmet    from 'helmet'
import cors      from 'cors'
import rateLimit from 'express-rate-limit'

import logger                from './utils/logger.js'
import { correlationId }     from './middleware/correlationId.js'
import { requestLogger }     from './middleware/requestLogger.js'
import { stripHeaders }      from './middleware/stripHeaders.js'
import { createAuthProxy }     from './proxy/auth.proxy.js'
import { createAcademicProxy } from './proxy/academic.proxy.js'
import { createDocumentProxy } from './proxy/document.proxy.js'
import healthRouter            from './routes/health.routes.js'

const REQUIRED_ENV = [
  'AUTH_SERVICE_URL',
  'ACADEMIC_SERVICE_URL',
  'DOCUMENT_SERVICE_URL',
  'FRONTEND_URL',
]
const missing = REQUIRED_ENV.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

const PORT         = parseInt(process.env.PORT || '3000', 10)
const FRONTEND_URL = process.env.FRONTEND_URL

const authProxy     = createAuthProxy()
const academicProxy = createAcademicProxy()
const documentProxy = createDocumentProxy()

const app = express()

app.use(stripHeaders)

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, 
}))

app.use(cors({
  origin:      FRONTEND_URL,
  credentials: true,
}))

app.use(correlationId)

app.use(requestLogger)

app.use('/health', healthRouter)

const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,  
  max:             500,
  message:         { error: 'Too many requests, slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             20,
  message:         { error: 'Too many auth attempts, try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

app.use(globalLimiter)

app.use('/api/auth/login',   authLimiter)
app.use('/api/auth/refresh', authLimiter)

app.use('/api/auth',  authProxy)
app.use('/api/users', authProxy)

app.use('/api/branches',             academicProxy)
app.use('/api/groups',               academicProxy)
app.use('/api/modules',              academicProxy)
app.use('/api/rooms',                academicProxy)
app.use('/api/teachers',             academicProxy)
app.use('/api/students',             academicProxy)
app.use('/api/sessions',             academicProxy)
app.use('/api/schedule',             academicProxy)
app.use('/api/module-teacher-groups', academicProxy)

app.use('/api/absences',              academicProxy)
app.use('/api/dashboard',             academicProxy) 

app.use('/api/documents',   documentProxy)
app.use('/api/assignments', documentProxy)
app.use('/api/submissions', documentProxy)

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `No route found for ${req.method} ${req.path}` })
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, ' api-gateway is running')
  logger.info(`   Health     http://localhost:${PORT}/health`)
  logger.info(`   Auth       http://localhost:${PORT}/api/auth/*`)
  logger.info(`   Academic   http://localhost:${PORT}/api/{branches,groups,modules,...}`)
  logger.info(`   Documents  http://localhost:${PORT}/api/{documents,assignments,submissions}`)
})

const shutdown = (signal) => {
  logger.info({ signal }, 'Graceful shutdown initiated')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

export default app
