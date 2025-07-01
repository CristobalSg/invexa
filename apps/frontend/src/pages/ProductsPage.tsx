// src/pages/ProductsPage.tsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProduct, getProducts } from "../services/productService";
import type { Product } from "../types/product";

const productSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  barCode: z.string().optional(),
  productTypeId: z.coerce.number().int(),

  presentation: z.object({
    description: z.string().min(1),
    baseQuantity: z.coerce.number().int().positive(),
    price: z.coerce.number().positive(),
    unitLabel: z.string().min(1),
    barCode: z.string().optional(),
  }),

  initialQuantity: z.coerce.number().int().nonnegative(),
});

type FormData = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productTypeId: 1,
    },
  });

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      reset();
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Crear producto</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input {...register("name")} className="input" />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Código de barras</label>
          <input {...register("barCode")} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium">Tipo de producto (ID)</label>
          <input type="number" {...register("productTypeId")} className="input" />
          {errors.productTypeId && <p className="text-red-500 text-sm">{errors.productTypeId.message}</p>}
        </div>

        <div className="col-span-full border-t pt-4">
          <h2 className="text-lg font-semibold">Presentación inicial</h2>
        </div>

        <div>
          <label className="block text-sm font-medium">Descripción</label>
          <input {...register("presentation.description")} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium">Cantidad base</label>
          <input type="number" {...register("presentation.baseQuantity")} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium">Precio</label>
          <input type="number" step="0.01" {...register("presentation.price")} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium">Unidad (ej. unidad, kg)</label>
          <input {...register("presentation.unitLabel")} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium">Código de barras (presentación)</label>
          <input {...register("presentation.barCode")} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium">Inventario inicial</label>
          <input type="number" {...register("initialQuantity")} className="input" />
        </div>

        <div className="col-span-full">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-xl font-bold mt-8">Productos</h2>
        {isLoading ? (
          <p>Cargando productos...</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {products.map((p: Product) => (
              <li key={p.id} className="border p-2 rounded shadow">
                <strong>{p.name}</strong> - Tipo ID: {p.productTypeId} - Barcode: {p.barCode || "—"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
