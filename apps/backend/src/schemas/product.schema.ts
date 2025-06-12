import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  cost: z.number().int().nonnegative().default(0),
  price: z.number().int().nonnegative().default(0),
  quantity: z.number().int().nonnegative().default(0),
})

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  cost: z.number().int().nonnegative().optional(),
  price: z.number().int().nonnegative().optional(),
  quantity: z.number().int().nonnegative().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
