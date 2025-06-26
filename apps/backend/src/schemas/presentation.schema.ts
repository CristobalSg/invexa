import { z } from 'zod'

export const createPresentationSchema = z.object({
  productId: z.number(),
  description: z.string().min(1),
  baseQuantity: z.number().int().min(1),
  price: z.number().min(0),
  unitLabel: z.string().min(1),
  barCode: z.string().optional()
})

export const updatePresentationSchema = z.object({
  description: z.string().min(1).optional(),
  baseQuantity: z.number().int().min(1).optional(),
  price: z.number().min(0).optional(),
  unitLabel: z.string().min(1).optional(),
  barCode: z.string().optional()
})

export type CreatePresentationInput = z.infer<typeof createPresentationSchema>
export type UpdatePresentationInput = z.infer<typeof updatePresentationSchema>
