import fetch from 'node-fetch'
import logger from './logger.js'

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'

export const verifyToken = async (token) => {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/verify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    if (!res.ok) throw { status: 401, message: 'Token verification failed' }
    return await res.json()
  } catch (err) {
    if (err.status) throw err
    logger.error({ err }, 'Auth service unreachable during token verification')
    throw { status: 503, message: 'Authentication service unavailable' }
  }
}

export const validateUserExists = async (userId, bearerToken) => {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/users/${userId}`, {
      method:  'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bearerToken}` },
    })
    if (res.status === 404) throw { status: 400, message: `User with id ${userId} does not exist in the auth service` }
    if (!res.ok)            throw { status: 502, message: 'Unexpected response from auth service' }
    return await res.json()
  } catch (err) {
    if (err.status) throw err
    logger.error({ err, userId }, 'Auth service unreachable during user validation')
    throw { status: 503, message: 'Authentication service unavailable' }
  }
}

/**
 * Fetch a user's public profile by id.
 * Returns null on 404 so callers can degrade gracefully.
 */
export const getUserById = async (userId, bearerToken) => {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/users/${userId}`, {
      method:  'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bearerToken}` },
    })
    if (res.status === 404) return null
    if (!res.ok) throw { status: res.status }
    return await res.json()  // { id, first_name, last_name, email, role, ... }
  } catch (err) {
    if (err.status) throw err
    logger.warn({ err, userId }, 'Auth service unreachable fetching user — degrading gracefully')
    return null
  }
}