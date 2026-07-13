import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting academic-service seed...')

  const roomData = [
    { name: 'Salle A101',       capacity: 30 },
    { name: 'Salle A102',       capacity: 30 },
    { name: 'Salle A201',       capacity: 25 },
    { name: 'Salle A202',       capacity: 25 },
    { name: 'Labo Réseau',      capacity: 24 },
    { name: 'Labo Informatique', capacity: 24 },
    { name: 'Salle Polyvalente', capacity: 50 },
  ]

  for (const r of roomData) {
    await prisma.room.upsert({
      where:  { name: r.name },
      update: { capacity: r.capacity },
      create: r,
    })
  }

  console.log(`${roomData.length} rooms seeded.`)
  console.log('Seed complete.')
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())