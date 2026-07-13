import 'dotenv/config'
import express         from 'express'
import helmet          from 'helmet'
import cors            from 'cors'
import rateLimit       from 'express-rate-limit'
import { resolve }     from 'path'
import multer          from 'multer'
import router          from './routes/index.js'
import logger          from './utils/logger.js'
import prisma          from './db.js'

const REQUIRED_ENV = ['DATABASE_URL', 'AUTH_SERVICE_URL', 'ACADEMIC_SERVICE_URL']
const missing = REQUIRED_ENV.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

const PORT        = parseInt(process.env.PORT || '3003', 10)
const UPLOAD_DIR  = resolve(process.env.UPLOAD_DIR || 'uploads')
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const app = express()

app.use(helmet())

app.use(cors({
  origin:      FRONTEND_URL,
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max:      100,
  message:  { error: 'Too many requests — please try again later' },
  standardHeaders: true,
  legacyHeaders:   false,
})
app.use('/api', (req, _res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, _res, next)
  }
  next()
})

app.use((req, _res, next) => {
  if (req.path !== '/health' && req.path !== '/api/health') {
    logger.info({ method: req.method, url: req.url }, 'Incoming request')
  }
  next()
})

app.use('/api', router)

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use((err, _req, res, _next) => {

  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large — maximum allowed size exceeded`
        : `File upload error: ${err.message}`
    return res.status(413).json({ error: msg })
  }


  if (err.status === 415) {
    return res.status(415).json({ error: err.message })
  }


  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Duplicate entry — record already exists' })
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Referenced record does not exist' })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: err.meta?.cause || 'Record not found' })
  }


  if (err.status && err.message) {
    return res.status(err.status).json({ error: err.message })
  }


  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, ' document-service is running')
})

const shutdown = async (signal) => {
  logger.info({ signal }, 'Graceful shutdown initiated')
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Server closed and DB disconnected')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

export default app
