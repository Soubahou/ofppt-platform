import prisma from '../db.js'
import { validateUserExists } from '../utils/authService.js'
import logger from '../utils/logger.js'

export const getAll = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit
  const take = Math.min(limit, 100)

  const [data, total] = await Promise.all([
    prisma.teacher.findMany({
      skip,
      take,
      orderBy: { hire_date: 'desc' },
      include: { _count: { select: { module_teachers: true } } },
    }),
    prisma.teacher.count(),
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
  const teacher = await prisma.teacher.findUnique({
    where:   { user_id: parseInt(id) },
    include: { _count: { select: { module_teachers: true } } },
  })
  if (!teacher) throw { status: 404, message: 'Teacher not found' }
  return teacher
}

export const getSchedule = async (id) => {
  await getById(id)  

  const moduleTeachers = await prisma.moduleTeacher.findMany({
    where:   { teacher_id: parseInt(id) },
    include: {
      module: true,
      module_teacher_groups: {
        where:   { is_active: true },
        include: {
          group:    true,
          sessions: {
            include: {
              room: true,
            },
          },
        },
      },
    },
  })


  const sessions = []
  for (const mt of moduleTeachers) {
    for (const mtg of mt.module_teacher_groups) {
      for (const session of mtg.sessions) {
        sessions.push({
          session_id:   session.id,
          day_of_week:  session.day_of_week,
          start_slot:   session.start_slot,
          slot_count:   session.slot_count,
          is_online:    session.is_online,
          room:         session.room,
          module:       { id: mt.module.id, name: mt.module.name, type: mt.module.type },
          group:        { id: mtg.group.id, name: mtg.group.name },
          module_teacher_group_id: mtg.id,
        })
      }
    }
  }


  sessions.sort((a, b) => a.day_of_week - b.day_of_week || a.start_slot - b.start_slot)

  return sessions
}

export const create = async ({ user_id, specialization, hire_date }, bearerToken) => {

  await validateUserExists(user_id, bearerToken)

  const existing = await prisma.teacher.findUnique({ where: { user_id } })
  if (existing) throw { status: 409, message: 'Teacher profile already exists for this user' }

  const teacher = await prisma.teacher.create({
    data: { user_id, specialization, hire_date },
  })
  logger.info({ userId: user_id }, 'Teacher profile created')
  return teacher
}

export const update = async (id, payload) => {
  await getById(id)
  const teacher = await prisma.teacher.update({
    where: { user_id: parseInt(id) },
    data:  payload,
  })
  logger.info({ userId: parseInt(id) }, 'Teacher profile updated')
  return teacher
}

export const remove = async (id) => {
  await getById(id)
  await prisma.teacher.delete({ where: { user_id: parseInt(id) } })
  logger.info({ userId: parseInt(id) }, 'Teacher profile deleted')
}
