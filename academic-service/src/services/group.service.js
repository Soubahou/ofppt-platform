import prisma from '../db.js'
import logger from '../utils/logger.js'

export const getAll = async (page = 1, limit = 10, filters = {}) => {
  const skip  = (page - 1) * limit
  const take  = Math.min(limit, 100)
  const where = {}

  if (filters.branch_id) {
    where.branch_id = parseInt(filters.branch_id)
  }

  const [data, total] = await Promise.all([
    prisma.group.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        branch: { select: { id: true, name: true } },
        _count:  { select: { students: true } },
      },
    }),
    prisma.group.count({ where }),
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
  const group = await prisma.group.findUnique({
    where:   { id: parseInt(id) },
    include: {
      branch:  { select: { id: true, name: true } },
      _count:  { select: { students: true } },
    },
  })
  if (!group) throw { status: 404, message: 'Group not found' }
  return group
}

export const getStudents = async (id, page = 1, limit = 10) => {
  const group = await getById(id)

  const skip = (page - 1) * limit
  const take = Math.min(limit, 100)

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where:   { group_id: group.id },
      skip,
      take,
      orderBy: { enrollment_date: 'desc' },
    }),
    prisma.student.count({ where: { group_id: group.id } }),
  ])

  return {
    group_id: group.id,
    data:     students,
    pagination: {
      total,
      page,
      limit:       take,
      total_pages: Math.ceil(total / take),
    },
  }
}

export const create = async ({ name, branch_id, max_students }) => {

  const branch = await prisma.branch.findUnique({ where: { id: branch_id } })
  if (!branch) throw { status: 400, message: `Branch with id ${branch_id} not found` }

  const group = await prisma.group.create({
    data: { name, branch_id, max_students },
    include: { branch: { select: { id: true, name: true } } },
  })
  logger.info({ groupId: group.id, name }, 'Group created')
  return group
}

export const update = async (id, payload) => {
  await getById(id)

  if (payload.branch_id) {
    const branch = await prisma.branch.findUnique({ where: { id: payload.branch_id } })
    if (!branch) throw { status: 400, message: `Branch with id ${payload.branch_id} not found` }
  }

  const group = await prisma.group.update({
    where:   { id: parseInt(id) },
    data:    payload,
    include: { branch: { select: { id: true, name: true } } },
  })
  logger.info({ groupId: group.id }, 'Group updated')
  return group
}

export const remove = async (id) => {
  await getById(id)
  await prisma.group.delete({ where: { id: parseInt(id) } })
  logger.info({ groupId: parseInt(id) }, 'Group deleted')
}
