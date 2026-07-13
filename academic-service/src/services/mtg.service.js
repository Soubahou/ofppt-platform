export const getAll = async (page = 1, limit = 50, filters = {}) => {
  const skip  = (page - 1) * limit
  const take  = Math.min(limit, 200)
  const where = {}
  if (filters.group_id)    where.group_id             = parseInt(filters.group_id)
  if (filters.teacher_id)  where.module_teacher        = { teacher_id: parseInt(filters.teacher_id) }
  if (filters.module_id)   where.module_teacher        = { ...where.module_teacher, module_id: parseInt(filters.module_id) }
  if (filters.is_active !== undefined) where.is_active = filters.is_active === 'true'

  const [data, total] = await Promise.all([
    prisma.moduleTeacherGroup.findMany({
      where,
      skip,
      take,
      include: mtgFullInclude,
      orderBy: { id: 'asc' },
    }),
    prisma.moduleTeacherGroup.count({ where }),
  ])

  return { data, pagination: { total, page, limit: take, total_pages: Math.ceil(total / take) } }
}

import prisma from '../db.js'
import logger from '../utils/logger.js'

const mtgFullInclude = {
  module_teacher: {
    include: {
      module:  true,
      teacher: true,
    },
  },
  group: true,
}

export const upsertModuleTeacherGroup = async (payload) => {
  const { module_id, teacher_id, group_id, hours_required } = payload

  const [module, group] = await Promise.all([
    prisma.module.findUnique({ where: { id: module_id } }),
    prisma.group.findUnique({ where: { id: group_id } }),
  ])

  if (!module) throw { status: 400, message: `Module with id ${module_id} not found` }
  if (!group)  throw { status: 400, message: `Group with id ${group_id} not found` }

  const teacher = await prisma.teacher.upsert({
    where:  { user_id: teacher_id },
    create: { user_id: teacher_id, specialization: 'Non renseigné', hire_date: new Date() },
    update: {},
  })

  const mt = await prisma.moduleTeacher.upsert({
    where:  { module_id_teacher_id: { module_id, teacher_id: teacher.user_id } },
    create: { module_id, teacher_id: teacher.user_id },
    update: {},
  })

  const mtg = await prisma.moduleTeacherGroup.upsert({
    where:   { module_teacher_id_group_id: { module_teacher_id: mt.id, group_id } },
    create:  { module_teacher_id: mt.id, group_id, hours_required },
    update:  { hours_required },
    include: mtgFullInclude,
  })

  logger.info({ mtgId: mtg.id, module_id, teacher_id, group_id }, 'ModuleTeacherGroup upserted')
  return mtg
}