import prisma from '../db.js'
import logger from '../utils/logger.js'

export const getAll = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit
  const take = Math.min(limit, 100)

  const [data, total] = await Promise.all([
    prisma.room.findMany({ skip, take, orderBy: { name: 'asc' } }),
    prisma.room.count(),
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
  const room = await prisma.room.findUnique({ where: { id: parseInt(id) } })
  if (!room) throw { status: 404, message: 'Room not found' }
  return room
}

export const create = async ({ name, capacity }) => {
  const room = await prisma.room.create({ data: { name, capacity } })
  logger.info({ roomId: room.id, name }, 'Room created')
  return room
}

export const update = async (id, payload) => {
  await getById(id)
  const room = await prisma.room.update({ where: { id: parseInt(id) }, data: payload })
  logger.info({ roomId: room.id }, 'Room updated')
  return room
}

export const remove = async (id) => {
  await getById(id)
  await prisma.room.delete({ where: { id: parseInt(id) } })
  logger.info({ roomId: parseInt(id) }, 'Room deleted')
}
