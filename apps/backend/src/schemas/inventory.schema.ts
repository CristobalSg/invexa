import { z } from 'zod'

export const createInventorySchema = z.object({
  warehouseId: z.number(),
  productId: z.number(),
  quantity: z.number().int().min(0),
})

export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0).optional(),
})

export type CreateInventoryInput = z.infer<typeof createInventorySchema>
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>
