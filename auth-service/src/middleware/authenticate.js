import { verifyAccessToken } from '../utils/jwt.js'

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyAccessToken(token)

    req.user = {
      id:          decoded.userId,
      role:        decoded.role,
      permissions: decoded.permissions, 
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
