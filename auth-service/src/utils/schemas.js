import { z } from 'zod'

export const loginSchema = z.object({
  email:    z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/,        'Password must contain at least one uppercase letter')
    .regex(/[0-9]/,        'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

export const createUserSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters'),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
    .transform((str) => new Date(str)),
  role_id: z
    .number({ required_error: 'role_id is required' })
    .int('Role ID must be an integer')
    .positive('Role ID must be positive'),
})

export const updateUserSchema = z.object({
  first_name: z
    .string()
    .min(1)
    .max(50, 'First name cannot exceed 50 characters')
    .optional(),
  last_name: z
    .string()
    .min(1)
    .max(50, 'Last name cannot exceed 50 characters')
    .optional(),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
    .transform((str) => new Date(str))
    .optional(),
  role_id: z
    .number()
    .int('Role ID must be an integer')
    .positive('Role ID must be positive')
    .optional(),
})
