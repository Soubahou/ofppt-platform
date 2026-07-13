import prisma  from '../db.js'
import path    from 'path'
import fs      from 'fs/promises'
import fssync  from 'fs'
import logger  from '../utils/logger.js'
import { generateEmail, generateDefaultPasswordHash } from '../utils/user.utils.js'

const safeUserSelect = {
  id:                   true,
  first_name:           true,
  last_name:            true,
  email:                true,
  date_of_birth:        true,
  must_change_password: true,
  avatar:               true,
  created_at:           true,
  role: {
    select: { id: true, name: true },
  },
}

const flattenUser = (u) => ({
  ...u,
  role:    u.role?.name  ?? null,
  role_id: u.role?.id    ?? null,
})

export const getAll = async (page = 1, limit = 10, search = '', role = '') => {
  const skip = (page - 1) * limit
  const take = Math.min(limit, 100)

  const where = {}
  if (search) {
    where.OR = [
      { first_name: { contains: search } },
      { last_name:  { contains: search } },
      { email:      { contains: search } },
    ]
  }
  if (role) {
    where.role = { name: role }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ select: safeUserSelect, where, skip, take, orderBy: { created_at: 'desc' } }),
    prisma.user.count({ where }),
  ])

  return {
    data:       users.map(flattenUser),
    total,
    totalPages: Math.ceil(total / take),
  }
}

export const getById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id: parseInt(id) }, select: safeUserSelect })
  if (!user) throw { status: 404, message: 'User not found' }
  return flattenUser(user)
}

export const create = async ({ first_name, last_name, date_of_birth, role_id }) => {
  const role = await prisma.role.findUnique({ where: { id: role_id } })
  if (!role) throw { status: 400, message: `No role found with id ${role_id}` }

  const email = await generateUniqueEmail(first_name, last_name)
  const { plainPassword, hashedPassword } = await generateDefaultPasswordHash(first_name, date_of_birth)

  const user = await prisma.user.create({
    data: {
      first_name,
      last_name,
      email,
      date_of_birth,
      password_hash:        hashedPassword,
      must_change_password: true,
      role_id,
    },
    select: safeUserSelect,
  })

  logger.info({ userId: user.id, email }, 'User created with default password')

  return { user: flattenUser(user), password: plainPassword }
}

const generateUniqueEmail = async (firstName, lastName) => {
  const baseEmail           = generateEmail(firstName, lastName)
  const [localPart, domain] = baseEmail.split('@')

  const existingUsers = await prisma.user.findMany({
    where: {
      email: { startsWith: localPart, endsWith: `@${domain}` },
    },
    select: { email: true },
  })

  if (existingUsers.length === 0) return baseEmail

  const takenSuffixes = new Set(
    existingUsers
      .map((u) => u.email.slice(localPart.length, -(domain.length + 1)))
      .filter((mid) => mid === '' || /^\d+$/.test(mid))
      .map((mid)    => (mid === '' ? 0 : parseInt(mid, 10))),
  )

  if (!takenSuffixes.has(0)) return baseEmail

  let counter = 1
  while (takenSuffixes.has(counter)) counter++

  return `${localPart}${counter}@${domain}`
}

export const update = async (id, { first_name, last_name, date_of_birth, role_id }) => {
  const user = await prisma.user.findUnique({ where: { id: parseInt(id) } })
  if (!user) throw { status: 404, message: 'User not found' }

  const data = {}
  if (first_name    !== undefined) data.first_name    = first_name
  if (last_name     !== undefined) data.last_name     = last_name
  if (date_of_birth !== undefined) data.date_of_birth = date_of_birth
  if (role_id       !== undefined) data.role_id       = role_id

  const updated = await prisma.user.update({ where: { id: parseInt(id) }, data, select: safeUserSelect })
  return flattenUser(updated)
}

export const remove = async (id) => {
  const user = await prisma.user.findUnique({ where: { id: parseInt(id) } })
  if (!user) throw { status: 404, message: 'User not found' }

  if (user.avatar) {
    const avatarPath = path.join(process.cwd(), user.avatar)
    await fs.unlink(avatarPath).catch(() => {})
  }

  await prisma.user.delete({ where: { id: parseInt(id) } })
}

export const getRoles = () =>
  prisma.role.findMany({ select: { id: true, name: true, description: true } })

export const setAvatar = async (userId, filePath) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    await fs.unlink(filePath).catch(() => {})
    throw { status: 404, message: 'User not found' }
  }

  if (user.avatar) {
    const oldPath = path.join(process.cwd(), user.avatar)
    await fs.unlink(oldPath).catch(() => {})
  }

  await prisma.user.update({ where: { id: userId }, data: { avatar: filePath } })

  return { avatar: filePath }
}

export const removeAvatar = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw { status: 404, message: 'User not found' }

  if (user.avatar) {
    const avatarPath = path.join(process.cwd(), user.avatar)
    await fs.unlink(avatarPath).catch(() => {})
  }

  await prisma.user.update({ where: { id: userId }, data: { avatar: null } })

  return { message: 'Avatar removed' }
}
