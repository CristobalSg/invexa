import { z } from 'zod'

export const createTransactionSchema = z.object({
  productId: z.number(),
  type: z.enum(['SALE', 'WASTE', 'ADJUSTMENT', 'ENTRY']),
  quantity: z.number().int().min(1),
  presentationId: z.number().optional(),
  date: z.string().datetime().optional()
})

export const updateTransactionSchema = z.object({
  type: z.enum(['SALE', 'WASTE', 'ADJUSTMENT', 'ENTRY']).optional(),
  quantity: z.number().int().min(1).optional(),
  presentationId: z.number().optional(),
  date: z.string().datetime().optional()
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
