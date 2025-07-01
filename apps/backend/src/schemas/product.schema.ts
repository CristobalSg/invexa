import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1),
  barCode: z.string().min(1).optional(),
  productTypeId: z.number(),
})

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  barCode: z.string().min(1).optional(),
  productTypeId: z.number().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
