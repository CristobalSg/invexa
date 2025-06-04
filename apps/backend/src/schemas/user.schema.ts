import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  name: z.string().min(1),
  email: z.string().email(),
  roleId: z.number().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
