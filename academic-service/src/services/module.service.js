import prisma  from '../db.js'
import logger  from '../utils/logger.js'

const moduleInclude = {
  module_teachers: {
    include: { teacher: true },
    take: 5,
  },
}

export const getAll = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit
  const take = Math.min(limit, 100)

  const [data, total] = await Promise.all([
    prisma.module.findMany({ skip, take, orderBy: { name: 'asc' }, include: moduleInclude }),
    prisma.module.count(),
  ])

  return {
    data: data.map(m => ({
      ...m,
      teachers: m.module_teachers.map(mt => ({ ...mt.teacher, module_teacher_id: mt.id })),
    })),
    pagination: { total, page, limit: take, total_pages: Math.ceil(total / take) },
  }
}

export const getById = async (id) => {
  const mod = await prisma.module.findUnique({
    where:   { id: parseInt(id) },
    include: moduleInclude,
  })
  if (!mod) throw { status: 404, message: 'Module not found' }
  return mod
}

export const getTeachers = async (id, page = 1, limit = 10) => {
  await getById(id)
  const skip = (page - 1) * limit
  const take = Math.min(limit, 100)

  const [data, total] = await Promise.all([
    prisma.moduleTeacher.findMany({
      where:   { module_id: parseInt(id) },
      skip, take,
      include: { teacher: true },
    }),
    prisma.moduleTeacher.count({ where: { module_id: parseInt(id) } }),
  ])

  return {
    module_id: parseInt(id),
    data:      data.map(mt => ({ ...mt.teacher, module_teacher_id: mt.id })),
    pagination: { total, page, limit: take, total_pages: Math.ceil(total / take) },
  }
}

export const create = async ({ name, type, credits, total_hours }) => {
  const mod = await prisma.module.create({
    data:    { name, type, credits, total_hours },
    include: moduleInclude,
  })
  logger.info({ moduleId: mod.id, name }, 'Module created')
  return mod
}

export const update = async (id, payload) => {
  await getById(id)
  const mod = await prisma.module.update({
    where:   { id: parseInt(id) },
    data:    payload,
    include: moduleInclude,
  })
  logger.info({ moduleId: mod.id }, 'Module updated')
  return mod
}

export const remove = async (id) => {
  await getById(id)
  await prisma.module.delete({ where: { id: parseInt(id) } })
  logger.info({ moduleId: parseInt(id) }, 'Module deleted')
}

export const assignTeacher = async (moduleId, userId) => {
  const mod = await prisma.module.findUnique({ where: { id: parseInt(moduleId) } })
  if (!mod) throw { status: 404, message: 'Module not found' }

  const teacher = await prisma.teacher.upsert({
    where:  { user_id: parseInt(userId) },
    create: {
      user_id:        parseInt(userId),
      specialization: 'Non renseigné',
      hire_date:      new Date(),
    },
    update: {},
  })

  const record = await prisma.moduleTeacher.upsert({
    where:  { module_id_teacher_id: { module_id: parseInt(moduleId), teacher_id: teacher.user_id } },
    create: { module_id: parseInt(moduleId), teacher_id: teacher.user_id },
    update: {},
    include: { teacher: true, module: true },
  })
  logger.info({ moduleId, userId, teacherId: teacher.user_id }, 'Teacher assigned to module')
  return record
}

export const unassignTeacher = async (moduleId, userId) => {
  const teacher = await prisma.teacher.findUnique({ where: { user_id: parseInt(userId) } })
  if (!teacher) throw { status: 404, message: 'Teacher not found' }

  const record = await prisma.moduleTeacher.findUnique({
    where: { module_id_teacher_id: { module_id: parseInt(moduleId), teacher_id: teacher.user_id } },
  })
  if (!record) throw { status: 404, message: 'Assignment not found' }

  await prisma.moduleTeacher.delete({ where: { id: record.id } })
  logger.info({ moduleId, userId }, 'Teacher unassigned from module')
}