import prisma from '../db.js'
import logger from '../utils/logger.js'

export const getAll = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit
  const take = Math.min(limit, 100)

  const [data, total] = await Promise.all([
    prisma.branch.findMany({
      skip,
      take,
      orderBy: { name: 'asc' },
      include: { groups: { select: { id: true, name: true, max_students: true, _count: { select: { students: true } } } } },
    }),
    prisma.branch.count(),
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
  const branch = await prisma.branch.findUnique({
    where:   { id: parseInt(id) },
    include: { groups: { select: { id: true, name: true, max_students: true } } },
  })
  if (!branch) throw { status: 404, message: 'Branch not found' }
  return branch
}

export const create = async ({ name, max_students }) => {
  const branch = await prisma.branch.create({ data: { name, max_students } })
  logger.info({ branchId: branch.id, name }, 'Branch created')
  return branch
}

export const update = async (id, payload) => {
  await getById(id)  
  const branch = await prisma.branch.update({
    where: { id: parseInt(id) },
    data:  payload,
  })
  logger.info({ branchId: branch.id }, 'Branch updated')
  return branch
}

export const remove = async (id) => {
  await getById(id)
  await prisma.branch.delete({ where: { id: parseInt(id) } })
  logger.info({ branchId: parseInt(id) }, 'Branch deleted')
}