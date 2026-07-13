import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Resetting academic-service data...')

  // Order matters — delete children before parents
  await prisma.absenceSession.deleteMany({})
  await prisma.absence.deleteMany({})
  await prisma.sessionInstance.deleteMany({})
  await prisma.session.deleteMany({})
  await prisma.moduleTeacherGroup.deleteMany({})
  await prisma.moduleTeacher.deleteMany({})
  await prisma.student.deleteMany({})
  await prisma.teacher.deleteMany({})
  await prisma.module.deleteMany({})
  await prisma.group.deleteMany({})
  await prisma.branch.deleteMany({})
  // Rooms are kept — re-seed them
  await prisma.room.deleteMany({})

  console.log('All data cleared.')

  // Re-seed rooms
  const rooms = [
    { name: 'Salle A101',        capacity: 30 },
    { name: 'Salle A102',        capacity: 30 },
    { name: 'Salle A201',        capacity: 25 },
    { name: 'Salle A202',        capacity: 25 },
    { name: 'Labo Réseau',       capacity: 24 },
    { name: 'Labo Informatique', capacity: 24 },
    { name: 'Salle Polyvalente', capacity: 50 },
  ]
  for (const r of rooms) {
    await prisma.room.create({ data: r })
  }
  console.log(`✅  ${rooms.length} salles re-seedées.`)
}

main()
  .catch((e) => { console.error('Reset failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())