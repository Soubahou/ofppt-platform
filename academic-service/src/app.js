import 'dotenv/config'
import express    from 'express'
import cors       from 'cors'
import helmet     from 'helmet'
import routes     from './routes/index.js'
import { startCleanupJob } from './jobs/cleanup.js'
import logger     from './utils/logger.js'
import prisma     from './db.js'

const app  = express()
const PORT = process.env.PORT || 3002

const requiredEnvVars = [
  'DATABASE_URL',
  'AUTH_SERVICE_URL',
]
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
  process.exit(1)
}

app.use(helmet())
app.use(cors({
  origin:      process.env.FRONTEND_URL || '*',
  credentials: true,
}))
app.use(express.json())

app.use('/api', routes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'academic-service', timestamp: new Date().toISOString() })
})

app.use((err, req, res, _next) => {
  const status  = err.status  || 500
  const message = err.message || 'Internal Server Error'


  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field'
    return res.status(409).json({ error: `${field} already exists`, code: 'DUPLICATE_ERROR' })
  }


  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' })
  }


  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Foreign key constraint failed — related record not found' })
  }

  if (status === 500) {
    logger.error({ err }, 'Unhandled error')
  }

  res.status(status).json({ error: message })
})

const stopCleanupJob = startCleanupJob()

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`)
  stopCleanupJob()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

app.listen(PORT, () => {
  logger.info(` Academic service running on http://localhost:${PORT}`)
  logger.info(`   Health   http://localhost:${PORT}/health`)
  logger.info(`   Auth     ${process.env.AUTH_SERVICE_URL}`)
})
