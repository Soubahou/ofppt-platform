export const ROLES = {
  DIRECTION: 'direction',
  FORMATEUR: 'formateur',
  STAGIAIRE: 'stagiaire',
}

export const PERMISSIONS = {

  READ_USER:   'read:user',
  CREATE_USER: 'create:user',
  UPDATE_USER: 'update:user',
  DELETE_USER: 'delete:user',

  READ_SCHEDULE:   'read:schedule',
  CREATE_SCHEDULE: 'create:schedule',
  UPDATE_SCHEDULE: 'update:schedule',
  DELETE_SCHEDULE: 'delete:schedule',

  READ_ABSENCE:    'read:absence',
  CREATE_ABSENCE:  'create:absence',
  UPDATE_ABSENCE:  'update:absence',
  DELETE_ABSENCE:  'delete:absence',
  APPROVE_ABSENCE: 'approve:absence',
  JUSTIFY_ABSENCE: 'justify:absence',

  READ_DOCUMENT:   'read:document',
  CREATE_DOCUMENT: 'create:document',
  UPDATE_DOCUMENT: 'update:document',
  DELETE_DOCUMENT: 'delete:document',
  ASSIGN_DOCUMENT: 'assign:document',
  SUBMIT_DOCUMENT: 'submit:document',

  READ_MODULE:   'read:module',
  CREATE_MODULE: 'create:module',
  UPDATE_MODULE: 'update:module',
  DELETE_MODULE: 'delete:module',
  READ_GROUP:    'read:group',
  CREATE_GROUP:  'create:group',
  UPDATE_GROUP:  'update:group',
  DELETE_GROUP:  'delete:group',

  READ_NOTIFICATION:   'read:notification',
  CREATE_NOTIFICATION: 'create:notification',
  DELETE_NOTIFICATION: 'delete:notification',
}

export function hasPermission(user, permission) {
  if (!user) return false
  if (!Array.isArray(user.permissions)) return false
  return user.permissions.includes(permission)
}

export function isRole(user, role) {
  return user?.role === role
}
