import prisma from '../db.js'
import { validateUserExists } from '../utils/authService.js'
import logger from '../utils/logger.js'

export const getAll = async (page = 1, limit = 10, filters = {}) => {
  const skip  = (page - 1) * limit
  const take  = Math.min(limit, 100)
  const where = {}

  if (filters.group_id !== undefined) {
    where.group_id = filters.group_id === 'null' ? null : parseInt(filters.group_id)
  }

  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take,
      orderBy: { enrollment_date: 'desc' },
      include: { group: { select: { id: true, name: true, branch: { select: { id: true, name: true } } } } },
    }),
    prisma.student.count({ where }),
  ])

  return {
    data,
    pagination: {
      total,
      page,
      limit:       take,
      total_pages: Math.ceil(total / take),
    },
  }
}

export const getById = async (id) => {
  const student = await prisma.student.findUnique({
    where:   { user_id: parseInt(id) },
    include: {
      group: { select: { id: true, name: true, branch: { select: { id: true, name: true } } } },
    },
  })
  if (!student) throw { status: 404, message: 'Student not found' }
  return student
}

export const create = async ({ user_id, group_id, enrollment_date }, bearerToken) => {

  await validateUserExists(user_id, bearerToken)

  const existing = await prisma.student.findUnique({ where: { user_id } })
  if (existing) throw { status: 409, message: 'Student profile already exists for this user' }

  if (group_id) {
    const group = await prisma.group.findUnique({ where: { id: group_id } })
    if (!group) throw { status: 400, message: `Group with id ${group_id} not found` }
  }

  const student = await prisma.student.create({
    data:    { user_id, group_id: group_id || null, enrollment_date },
    include: { group: { select: { id: true, name: true } } },
  })
  logger.info({ userId: user_id }, 'Student profile created')
  return student
}

export const update = async (id, payload) => {
  await getById(id)

  if (payload.group_id) {
    const group = await prisma.group.findUnique({ where: { id: payload.group_id } })
    if (!group) throw { status: 400, message: `Group with id ${payload.group_id} not found` }
  }

  const student = await prisma.student.update({
    where:   { user_id: parseInt(id) },
    data:    payload,
    include: { group: { select: { id: true, name: true } } },
  })
  logger.info({ userId: parseInt(id) }, 'Student profile updated')
  return student
}

export const remove = async (id) => {
  await getById(id)
  await prisma.student.delete({ where: { user_id: parseInt(id) } })
  logger.info({ userId: parseInt(id) }, 'Student profile deleted')
}
