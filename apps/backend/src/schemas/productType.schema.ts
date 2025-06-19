import { z } from 'zod'

export const createProductTypeSchema = z.object({
  name: z.string().min(1)
})

export const updateProductTypeSchema = z.object({
  name: z.string().min(1).optional()
})

export type CreateProductTypeInput = z.infer<typeof createProductTypeSchema>
export type UpdateProductTypeInput = z.infer<typeof updateProductTypeSchema>
