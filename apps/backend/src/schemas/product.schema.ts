import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1),
  productTypeId: z.number(),
  barCode: z.string(),
  companyId: z.union([z.string(), z.number()]),

  // Anidar presentación
  presentation: z.object({
    price: z.number().positive(),
    description: z.string().min(1).optional(),
    unitLabel: z.string().min(1).optional(),
  }),

  // Cantidad inicial de inventario
  initialQuantity: z.number().int().nonnegative(),
});


export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  barCode: z.string().min(1).optional(),
  productTypeId: z.number().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
