import prisma from '../db.js'
import logger from '../utils/logger.js'

const todayDayIndex = () => {
  const d = new Date().getDay()
  return d === 0 || d === 6 ? null : d - 1
}

export const getStats = async () => {
  const today = todayDayIndex()

  // Simple counts — these can't fail
  const [students, teachers, groups, pendingAbsences, sessions] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.group.count(),
    prisma.absence.count({ where: { status: 'pending' } }),
    prisma.session.count({ where: { start_slot: { not: null } } }),
  ])

  // Recent absences — flat query, no deep nesting
  const rawAbsences = await prisma.absence.findMany({
    take:    5,
    orderBy: { created_at: 'desc' },
    select:  { user_id: true, status: true },
  })

  const recentAbsences = rawAbsences.map(a => ({
    name:   `Stagiaire #${a.user_id}`,
    group:  '—',
    status: a.status,
  }))

  // Room usage — two flat queries joined in JS
  const allRooms = await prisma.room.findMany({
    select: { id: true, name: true },
  })

  const roomSessionMap = {}
  if (today !== null) {
    const activeSessions = await prisma.session.findMany({
      where: {
        day_of_week: today,
        start_slot:  { not: null },
        room_id:     { not: null },
      },
      select: { room_id: true },
    })
    for (const s of activeSessions) {
      if (s.room_id) roomSessionMap[s.room_id] = true
    }
  }

  const rooms = allRooms.map(r => ({
    name: r.name,
    busy: !!roomSessionMap[r.id],
    info: roomSessionMap[r.id] ? 'Occupée' : 'Disponible',
  }))

  logger.info({ students, teachers, groups, pendingAbsences, sessions }, 'Dashboard stats fetched')
  return { students, teachers, groups, sessions, pendingAbsences, recentAbsences, rooms }
}