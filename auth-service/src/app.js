import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import routes from './routes/index.js'
import { startCleanupJob } from './jobs/cleanup.js'
import logger from './utils/logger.js'
import prisma from './db.js'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app  = express()
const PORT = process.env.PORT || 3001

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'EMAIL_DOMAIN',
  'UPLOAD_DIR',
]
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
  process.exit(1)
}

if (process.env.JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET is too short. Use at least 32 characters for security.')
}

const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR, 'avatars')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
  logger.info(`Created upload directory: ${uploadDir}`)
}

app.use(helmet())
app.use(cors({
  origin:      process.env.FRONTEND_URL,
  credentials: true,
}))
app.use(express.json())

app.use('/uploads', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR)))

app.use('/api', routes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() })
})

app.use((err, req, res, _next) => {
  const status  = err.status  || 500
  const message = err.message || 'Internal Server Error'

  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field'
    return res.status(409).json({ error: `${field} already exists`, code: 'DUPLICATE_ERROR' })
  }

  if (status === 500) {
    logger.error({ error: err }, 'Unhandled error')
  }

  res.status(status).json({ error: message })
})

const stopCleanupJob = startCleanupJob()

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing gracefully...')
  stopCleanupJob()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing gracefully...')
  stopCleanupJob()
  await prisma.$disconnect()
  process.exit(0)
})

app.listen(PORT, () => {
  logger.info(` Auth service running on http://localhost:${PORT}`)
  logger.info(`   Health  http://localhost:${PORT}/health`)
})
