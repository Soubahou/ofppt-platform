import { verifyToken } from '../utils/authService.js'
import logger from '../utils/logger.js'

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const result = await verifyToken(token)

    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = {
      id:          result.userId,
      role:        result.role,
      permissions: result.permissions || [],
    }


    req.rawToken = token

    next()
  } catch (err) {
    const status  = err.status  || 401
    const message = err.message || 'Authentication failed'
    logger.warn({ err }, 'Authentication failed')
    return res.status(status).json({ error: message })
  }
}
