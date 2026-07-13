import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('⚠️  Resetting document-service data...')

  await prisma.exerciseSubmission.deleteMany({})
  await prisma.exerciseAssignment.deleteMany({})
  await prisma.moduleDocument.deleteMany({})
  await prisma.document.deleteMany({})

  console.log('✅  All document data cleared.')
}

main()
  .catch((e) => { console.error('Reset failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())