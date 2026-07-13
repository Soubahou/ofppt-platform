import prisma  from '../db.js'
import logger  from '../utils/logger.js'

const paginate = (page = 1, limit = 20) => {
  const p    = Math.max(1, parseInt(page, 10))
  const l    = Math.min(100, Math.max(1, parseInt(limit, 10)))
  return { skip: (p - 1) * l, take: l, page: p, limit: l }
}

const absenceWithSessions = {
  id:            true,
  user_id:       true,
  reason:        true,
  justification: true,
  status:        true,
  justified:     true,
  created_at:    true,
  updated_at:    true,
  sessions: {
    select: {
      instance: {
        select: {
          id:           true,
          date:         true,
          is_cancelled: true,
          session: {
            select: {
              id:          true,
              day_of_week: true,
              start_slot:  true,
              slot_count:  true,
              module_teacher_group: {
                select: {
                  module_teacher: {
                    select: {
                      module:  { select: { id: true, name: true } },
                      teacher: { select: { user_id: true, specialization: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

export const listAbsences = async (filters, requestingUser) => {
  const { page, limit, skip, take } = paginate(filters.page, filters.limit)

  const where = {}



  if (requestingUser.role === 'stagiaire') {
    where.user_id = requestingUser.id
  } else if (filters.user_id) {
    where.user_id = parseInt(filters.user_id, 10)
  }

  if (filters.status) where.status = filters.status


  if (filters.group_id && requestingUser.role !== 'stagiaire') {
    const students = await prisma.student.findMany({
      where:  { group_id: parseInt(filters.group_id, 10) },
      select: { user_id: true },
    })
    const studentIds = students.map((s) => s.user_id)
    where.user_id = { in: studentIds }
  }

  const [data, total] = await Promise.all([
    prisma.absence.findMany({
      where,
      select:  absenceWithSessions,
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.absence.count({ where }),
  ])

  return {
    data,
    pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
  }
}

export const getAbsenceById = async (id, requestingUser) => {
  const absence = await prisma.absence.findUniqueOrThrow({
    where:  { id },
    select: absenceWithSessions,
  })


  if (requestingUser.role === 'stagiaire' && absence.user_id !== requestingUser.id) {
    throw { status: 403, message: 'You can only view your own absences' }
  }

  return absence
}

export const createAbsence = async ({ user_id, instance_ids, reason }) => {

  const instances = await prisma.sessionInstance.findMany({
    where: { id: { in: instance_ids } },
  })

  if (instances.length !== instance_ids.length) {
    const found   = instances.map((i) => i.id)
    const missing = instance_ids.filter((id) => !found.includes(id))
    throw { status: 400, message: `Session instances not found: ${missing.join(', ')}` }
  }


  const existing = await prisma.absenceSession.findFirst({
    where: {
      instance_id: { in: instance_ids },
      absence:     { user_id },
    },
  })

  if (existing) {
    throw { status: 409, message: 'An absence already exists for one or more of these sessions' }
  }

  const absence = await prisma.absence.create({
    data: {
      user_id,
      reason: reason ?? null,
      sessions: {
        create: instance_ids.map((instance_id) => ({ instance_id })),
      },
    },
    select: absenceWithSessions,
  })

  logger.info({ absenceId: absence.id, user_id }, 'Absence created')
  return absence
}

export const updateAbsence = async (id, { reason, justification }, requestingUser) => {
  const absence = await prisma.absence.findUniqueOrThrow({ where: { id } })


  if (requestingUser.role === 'stagiaire' && absence.user_id !== requestingUser.id) {
    throw { status: 403, message: 'You can only update your own absences' }
  }


  if (absence.status !== 'pending' && requestingUser.role === 'stagiaire') {
    throw { status: 400, message: 'Cannot modify an absence that has already been reviewed' }
  }

  return prisma.absence.update({
    where:  { id },
    data: {
      ...(reason        !== undefined && { reason }),
      ...(justification !== undefined && { justification }),
    },
    select: absenceWithSessions,
  })
}

export const justifyAbsence = async (id, { justification }, requestingUser) => {
  const absence = await prisma.absence.findUniqueOrThrow({ where: { id } })

  if (absence.user_id !== requestingUser.id) {
    throw { status: 403, message: 'You can only justify your own absences' }
  }

  if (absence.status === 'rejected') {
    throw { status: 400, message: 'Cannot justify a rejected absence' }
  }

  const updated = await prisma.absence.update({
    where:  { id },
    data:   { justification, justified: true },
    select: absenceWithSessions,
  })

  logger.info({ absenceId: id, user_id: requestingUser.id }, 'Absence justified')
  return updated
}

export const approveAbsence = async (id, requestingUser) => {
  if (requestingUser.role !== 'direction')
    throw { status: 403, message: 'Seule la direction peut valider les absences' }

  const absence = await prisma.absence.findUniqueOrThrow({ where: { id } })

  if (absence.status === 'approved')
    throw { status: 400, message: 'Cette absence est déjà validée' }

  const updated = await prisma.absence.update({
    where:  { id },
    data:   { status: 'approved' },
    select: absenceWithSessions,
  })

  logger.info({ absenceId: id, approvedBy: requestingUser.id }, 'Absence approved')
  return updated
}

export const rejectAbsence = async (id, requestingUser) => {
  if (requestingUser.role !== 'direction')
    throw { status: 403, message: 'Seule la direction peut rejeter les absences' }

  const absence = await prisma.absence.findUniqueOrThrow({ where: { id } })

  if (absence.status === 'rejected')
    throw { status: 400, message: 'Cette absence est déjà rejetée' }

  const updated = await prisma.absence.update({
    where:  { id },
    data:   { status: 'rejected' },
    select: absenceWithSessions,
  })

  logger.info({ absenceId: id, rejectedBy: requestingUser.id }, 'Absence rejected')
  return updated
}

export const deleteAbsence = async (id) => {
  await prisma.absence.findUniqueOrThrow({ where: { id } })
  await prisma.absence.delete({ where: { id } })
  logger.info({ absenceId: id }, 'Absence deleted')
}

export const getAbsencesByStudent = async (userId, filters, requestingUser) => {

  if (requestingUser.role === 'stagiaire' && userId !== requestingUser.id) {
    throw { status: 403, message: 'You can only view your own absences' }
  }

  return listAbsences({ ...filters, user_id: userId }, requestingUser)
}

export const getStats = async () => {
  const [total, pending, approved, rejected] = await Promise.all([
    prisma.absence.count(),
    prisma.absence.count({ where: { status: 'pending'  } }),
    prisma.absence.count({ where: { status: 'approved' } }),
    prisma.absence.count({ where: { status: 'rejected' } }),
  ])
  return { total, pending, approved, rejected }
}