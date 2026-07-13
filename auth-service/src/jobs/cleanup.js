import prisma from '../db.js'
import logger from '../utils/logger.js'

export const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    })

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired refresh tokens`)
    }

    return result.count
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup expired tokens')
    throw error
  }
}

export const startCleanupJob = () => {

  const INTERVAL_MS = 24 * 60 * 60 * 1000


  cleanupExpiredTokens().catch((err) => {
    logger.error({ err }, 'Initial token cleanup failed')
  })


  const intervalId = setInterval(() => {
    cleanupExpiredTokens().catch((err) => {
      logger.error({ err }, 'Scheduled token cleanup failed')
    })
  }, INTERVAL_MS)


  return () => clearInterval(intervalId)
}
