import { mkdirSync } from 'fs'

async function main() {
  console.log('Starting document-service seed...')
  mkdirSync('uploads/documents',   { recursive: true })
  mkdirSync('uploads/submissions', { recursive: true })
  console.log('Upload directories created.')
  console.log('Seed complete.')
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1) })