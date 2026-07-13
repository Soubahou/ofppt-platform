import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const permissions = [

  { action: 'create', resource: 'user',         description: 'Create a new user' },
  { action: 'read',   resource: 'user',         description: 'View user information' },
  { action: 'update', resource: 'user',         description: 'Update user information' },
  { action: 'delete', resource: 'user',         description: 'Delete a user' },

  { action: 'create', resource: 'schedule',     description: 'Create a schedule entry' },
  { action: 'read',   resource: 'schedule',     description: 'View schedules' },
  { action: 'update', resource: 'schedule',     description: 'Modify a schedule' },
  { action: 'delete', resource: 'schedule',     description: 'Delete a schedule entry' },

  { action: 'create', resource: 'absence',      description: 'Submit an absence request' },
  { action: 'read',   resource: 'absence',      description: 'View absence records' },
  { action: 'update', resource: 'absence',      description: 'Modify an absence record' },
  { action: 'delete', resource: 'absence',      description: 'Delete an absence record' },
  { action: 'approve',resource: 'absence',      description: 'Approve or reject an absence' },
  { action: 'justify',resource: 'absence',      description: 'Submit justification for an absence' },

  { action: 'create', resource: 'document',     description: 'Upload a document' },
  { action: 'read',   resource: 'document',     description: 'View or download a document' },
  { action: 'update', resource: 'document',     description: 'Modify document metadata' },
  { action: 'delete', resource: 'document',     description: 'Delete a document' },
  { action: 'assign', resource: 'document',     description: 'Assign an exercise to a group' },
  { action: 'submit', resource: 'document',     description: 'Submit an exercise response' },

  { action: 'create', resource: 'module',       description: 'Create a module' },
  { action: 'read',   resource: 'module',       description: 'View module information' },
  { action: 'update', resource: 'module',       description: 'Modify a module' },
  { action: 'delete', resource: 'module',       description: 'Delete a module' },
  { action: 'create', resource: 'group',        description: 'Create a group' },
  { action: 'read',   resource: 'group',        description: 'View group information' },
  { action: 'update', resource: 'group',        description: 'Modify a group' },
  { action: 'delete', resource: 'group',        description: 'Delete a group' },

  { action: 'create', resource: 'notification', description: 'Send a notification' },
  { action: 'read',   resource: 'notification', description: 'View notifications' },
  { action: 'delete', resource: 'notification', description: 'Delete a notification' },
]

const rolePermissions = {
  direction: [
    'create:user', 'read:user', 'update:user', 'delete:user',
    'create:schedule', 'read:schedule', 'update:schedule', 'delete:schedule',
    'read:absence', 'update:absence', 'delete:absence', 'approve:absence',
    'create:document', 'read:document', 'update:document', 'delete:document',
    'create:module', 'read:module', 'update:module', 'delete:module',
    'create:group', 'read:group', 'update:group', 'delete:group',
    'create:notification', 'read:notification', 'delete:notification',
  ],
  formateur: [
    'read:user',
    'read:schedule',
    'read:absence',
    'create:document', 'read:document', 'update:document', 'delete:document', 'assign:document',
    'read:module',
    'read:group',
    'create:notification', 'read:notification',
  ],
  stagiaire: [
    'read:schedule',
    'create:absence', 'read:absence', 'update:absence', 'justify:absence',
    'read:document', 'submit:document',
    'read:module',
    'read:group',
    'read:notification',
  ],
}

async function main() {
  console.log(' Starting database seed...')


  console.log('   Creating permissions...')
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { action_resource: { action: perm.action, resource: perm.resource } },
      update: { description: perm.description },
      create: perm,
    })
  }
  console.log(`   ${permissions.length} permissions created`)


  console.log('   Creating roles...')
  const roleDescriptions = {
    direction: 'Administration and management',
    formateur:  'Teacher / trainer',
    stagiaire:  'Student / trainee',
  }
  for (const [name, description] of Object.entries(roleDescriptions)) {
    await prisma.role.upsert({
      where:  { name },
      update: {},
      create: { name, description },
    })
  }
  console.log('   3 roles created (direction, formateur, stagiaire)')


  console.log('   Assigning permissions to roles...')
  for (const [roleName, permKeys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    for (const key of permKeys) {
      const [action, resource] = key.split(':')
      const permission = await prisma.permission.findUnique({
        where: { action_resource: { action, resource } },
      })
      if (role && permission) {
        await prisma.rolePermission.upsert({
          where: { role_id_permission_id: { role_id: role.id, permission_id: permission.id } },
          update: {},
          create: { role_id: role.id, permission_id: permission.id },
        })
      }
    }
    console.log(`   ${permKeys.length} permissions assigned to ${roleName}`)
  }


  console.log('   Creating default admin user...')
  const directionRole = await prisma.role.findUnique({ where: { name: 'direction' } })
  await prisma.user.upsert({
    where:  { email: 'admin@ofppt.ma' },
    update: {},
    create: {
      first_name: 'Admin',
      last_name: 'System',
      email: 'admin@ofppt.ma',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      date_of_birth: new Date('2000-01-01'),
      must_change_password: false,
      role_id: directionRole.id,
    },
  })
  console.log('   Default admin created    admin@ofppt.ma / Admin@1234')

  console.log('\n Seed complete!')
}

main()
  .catch((e) => {
    console.error(' Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
