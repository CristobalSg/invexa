import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  barcode: z.string().min(1, "Código requerido"),
  quantity: z.coerce.number().nonnegative("Cantidad inválida"),
  cost: z.coerce.number().nonnegative("Costo inválido"),
  price: z.coerce.number().nonnegative("Precio inválido"),
});

export type ProductFormData = z.infer<typeof productSchema>;
