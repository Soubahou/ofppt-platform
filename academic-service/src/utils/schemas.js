import { z } from 'zod'

const positiveInt = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be an integer')
  .positive('Must be a positive integer')

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
  .transform((s) => new Date(s))

export const createBranchSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(100, 'Name too long'),
  max_students: positiveInt,
})

export const updateBranchSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  max_students: positiveInt.optional(),
})

export const createGroupSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(50, 'Name too long'),
  branch_id:    positiveInt,
  max_students: positiveInt,
})

export const updateGroupSchema = z.object({
  name:         z.string().min(1).max(50).optional(),
  branch_id:    positiveInt.optional(),
  max_students: positiveInt.optional(),
})

export const createModuleSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(100, 'Name too long'),
  type:        z.enum(['theoretical', 'practical'], {
    errorMap: () => ({ message: "type must be 'theoretical' or 'practical'" }),
  }),
  credits:     positiveInt,
  total_hours: positiveInt,
})

export const updateModuleSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  type:        z.enum(['theoretical', 'practical']).optional(),
  credits:     positiveInt.optional(),
  total_hours: positiveInt.optional(),
})

export const assignTeacherSchema = z.object({
  teacher_id: positiveInt,
})

export const createRoomSchema = z.object({
  name:     z.string().min(1, 'Name is required').max(50, 'Name too long'),
  capacity: positiveInt,
})

export const updateRoomSchema = z.object({
  name:     z.string().min(1).max(50).optional(),
  capacity: positiveInt.optional(),
})

export const createTeacherSchema = z.object({
  user_id:        positiveInt,
  specialization: z.string().min(1, 'Specialization is required').max(100, 'Too long'),
  hire_date:      dateString,
})

export const updateTeacherSchema = z.object({
  specialization: z.string().min(1).max(100).optional(),
  hire_date:      dateString.optional(),
})

export const createStudentSchema = z.object({
  user_id:         positiveInt,
  group_id:        positiveInt.optional().nullable(),
  enrollment_date: dateString,
})

export const updateStudentSchema = z.object({
  group_id:        positiveInt.optional().nullable(),
  enrollment_date: dateString.optional(),
})

export const createSessionSchema = z.object({
  module_teacher_group_id: positiveInt,
  day_of_week:  z.coerce.number().int().min(0).max(6).optional().nullable(),
  start_slot:   z.coerce.number().int().min(0).optional().nullable(),
  slot_count:   z.coerce.number().int().min(1, 'slot_count must be >= 1'),
  is_online:    z.coerce.boolean().optional().default(false),
  room_id:      positiveInt.optional().nullable(),
})

export const updateSessionSchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6).optional(),
  start_slot:  z.coerce.number().int().min(0).optional(),
  slot_count:  z.coerce.number().int().min(1).optional(),
  is_online:   z.coerce.boolean().optional(),
  room_id:     positiveInt.optional().nullable(),
})

export const generateInstancesSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD'),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD'),
})

export const patchInstanceSchema = z.object({
  is_cancelled:    z.boolean().optional(),
  override_room_id: positiveInt.optional().nullable(),
})

export const createAbsenceSchema = z.object({

  instance_ids: z
    .array(positiveInt, { required_error: 'instance_ids is required' })
    .min(1, 'At least one session instance must be provided'),
  reason: z.string().max(1000, 'Reason too long').optional().nullable(),
})

export const updateAbsenceSchema = z.object({
  reason:        z.string().max(1000).optional().nullable(),
  justification: z.string().max(2000).optional().nullable(),
})

export const justifyAbsenceSchema = z.object({
  justification: z.string().min(1, 'Justification is required').max(2000, 'Justification too long'),
})

export const upsertModuleTeacherGroupSchema = z.object({
  module_id:      positiveInt,
  teacher_id:     positiveInt,
  group_id:       positiveInt,
  hours_required: positiveInt,
})
