import prisma from '../db.js'
import logger from '../utils/logger.js'

const RETENTION_DAYS = parseInt(process.env.CANCELLED_INSTANCE_RETENTION_DAYS || '30')

export const cleanupCancelledInstances = async () => {
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

    const result = await prisma.sessionInstance.deleteMany({
      where: {
        is_cancelled: true,
        date: { lt: cutoff },
      },
    })

    if (result.count > 0) {
      logger.info({ count: result.count, retentionDays: RETENTION_DAYS }, 'Cleaned up old cancelled session instances')
    }

    return result.count
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup cancelled session instances')
    throw error
  }
}

export const startCleanupJob = () => {

  const INTERVAL_MS = 24 * 60 * 60 * 1000


  cleanupCancelledInstances().catch((err) => {
    logger.error({ err }, 'Initial cleanup failed')
  })


  const intervalId = setInterval(() => {
    cleanupCancelledInstances().catch((err) => {
      logger.error({ err }, 'Scheduled cleanup failed')
    })
  }, INTERVAL_MS)


  return () => clearInterval(intervalId)
}
