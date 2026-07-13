import prisma from '../db.js'
import { comparePassword, hashPassword } from '../utils/hash.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} from '../utils/jwt.js'
import logger from '../utils/logger.js'

const getUserWithPermissions = (where) =>
  prisma.user.findUnique({
    where,
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  })

const flattenPermissions = (rolePermissions) =>
  rolePermissions.map((rp) => `${rp.permission.action}:${rp.permission.resource}`)

const createRefreshTokenRecord = (token, userId) => {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  return prisma.refreshToken.create({
    data: { token, user_id: userId, expires_at: expiresAt },
  })
}

export const login = async (email, password) => {



  const user = await getUserWithPermissions({ email })


  if (!user) throw { status: 401, message: 'Invalid credentials' }

  const valid = await comparePassword(password, user.password_hash)
  if (!valid) throw { status: 401, message: 'Invalid credentials' }

  const permissions  = flattenPermissions(user.role.permissions)
  const tokenPayload = { userId: user.id, role: user.role.name, permissions }

  const accessToken  = generateAccessToken(tokenPayload)
  const refreshToken = generateRefreshToken({ userId: user.id })

  await createRefreshTokenRecord(refreshToken, user.id)

  return {
    accessToken,
    refreshToken,
    must_change_password: user.must_change_password,
    user: {
      id:                   user.id,
      first_name:           user.first_name,
      last_name:            user.last_name,
      email:                user.email,
      must_change_password: user.must_change_password,
      role:                 user.role.name,
      permissions,
    },
  }
}

export const logout = async (refreshToken) => {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
}

export const refresh = async (refreshToken) => {

  let decoded
  try {
    decoded = verifyRefreshToken(refreshToken)
  } catch {
    throw { status: 401, message: 'Invalid refresh token' }
  }


  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored || stored.expires_at < new Date()) {
    throw { status: 401, message: 'Refresh token expired or revoked' }
  }


  await prisma.refreshToken.delete({ where: { id: stored.id } })


  const user = await getUserWithPermissions({ id: decoded.userId })
  if (!user) throw { status: 401, message: 'User not found' }

  const permissions = flattenPermissions(user.role.permissions)


  const newAccessToken  = generateAccessToken({ userId: user.id, role: user.role.name, permissions })
  const newRefreshToken = generateRefreshToken({ userId: user.id })

  await createRefreshTokenRecord(newRefreshToken, user.id)

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw { status: 404, message: 'User not found' }

  const valid = await comparePassword(currentPassword, user.password_hash)
  if (!valid) throw { status: 401, message: 'Current password is incorrect' }

  const hashedPassword = await hashPassword(newPassword)


  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data:  { password_hash: hashedPassword, must_change_password: false },
    })
    await tx.refreshToken.deleteMany({ where: { user_id: userId } })
  })

  logger.info({ userId }, 'Password changed successfully')

  return { message: 'Password changed successfully' }
}

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:                   true,
      first_name:           true,
      last_name:            true,
      email:                true,
      date_of_birth:        true,
      must_change_password: true,
      avatar:               true,
      created_at:           true,
      role: {
        select: {
          name: true,
          permissions: {
            select: { permission: { select: { action: true, resource: true } } },
          },
        },
      },
    },
  })

  if (!user) throw { status: 404, message: 'User not found' }

  return {
    id:                   user.id,
    first_name:           user.first_name,
    last_name:            user.last_name,
    email:                user.email,
    date_of_birth:        user.date_of_birth,
    must_change_password: user.must_change_password,
    avatar:               user.avatar,
    created_at:           user.created_at,
    role:                 user.role.name,
    permissions:          user.role.permissions.map(
      (rp) => `${rp.permission.action}:${rp.permission.resource}`,
    ),
  }
}

export const verifyToken = (token) => {
  try {
    const decoded = verifyAccessToken(token)
    return { valid: true, userId: decoded.userId, role: decoded.role, permissions: decoded.permissions }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}
