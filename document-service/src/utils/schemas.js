import { z } from 'zod'

const positiveInt = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be an integer')
  .positive('Must be a positive integer')

export const createDocumentSchema = z.object({
  title: z.string({ required_error: 'Title is required' })
           .min(1, 'Title cannot be empty')
           .max(255, 'Title too long'),
  type:  z.enum(['course', 'exercise', 'resource'], {
           errorMap: () => ({ message: "type must be 'course', 'exercise', or 'resource'" }),
         }),
})

export const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255, 'Title too long').optional(),
  type:  z.enum(['course', 'exercise', 'resource'], {
           errorMap: () => ({ message: "type must be 'course', 'exercise', or 'resource'" }),
         }).optional(),
}).refine(
  (data) => data.title !== undefined || data.type !== undefined,
  { message: 'At least one of title or type must be provided' },
)

export const linkDocumentSchema = z.object({
  document_id: positiveInt,
})

const dueDateSchema = z
  .string()
  .refine(
    (v) => !isNaN(Date.parse(v)),
    { message: 'due_date must be a valid date, e.g. "2025-06-30" or "2025-06-30T23:59:00.000Z"' },
  )
  .optional()
  .nullable()

export const createAssignmentSchema = z.object({
  document_id: positiveInt,
  group_id:    positiveInt,
  module_id:   positiveInt,
  due_date:    dueDateSchema,
})

export const updateAssignmentSchema = z.object({
  due_date: dueDateSchema,
})

export const createSubmissionSchema = z.object({
  exercise_assignment_id: positiveInt,
})

export const patchSubmissionStatusSchema = z.object({
  status: z.enum(['reviewed', 'graded'], {
    errorMap: () => ({ message: "status must be 'reviewed' or 'graded'" }),
  }),
})

export const gradeSubmissionSchema = z.object({
  grade:    z.coerce.number({ invalid_type_error: 'Grade must be a number' })
              .min(0, 'Grade cannot be below 0')
              .max(20, 'Grade cannot exceed 20')
              .optional(),
  feedback: z.string().max(2000, 'Feedback is too long').optional(),
}).refine(
  (d) => d.grade !== undefined || (d.feedback !== undefined && d.feedback.trim().length > 0),
  { message: 'At least a grade or feedback must be provided' },
)