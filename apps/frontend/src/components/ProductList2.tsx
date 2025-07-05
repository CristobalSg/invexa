import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, deleteProduct } from "../services/productService";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";

export default function ProductList() {
  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleEdit = (product: Product) => {
    console.log("Editar producto:", product);
    // Aquí puedes abrir el modal y setear el producto en edición
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <p>Cargando productos...</p>;
  if (error) return <p className="text-red-500">Error al cargar productos</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products?.map((product) => (
          <ProductCard
            key={product.id}
            name={product.name}
            description={
              
              <div>
                <p className="text-sm text-gray-500">Código de barras: {product.barCode}</p>
                <p className="text-sm text-gray-500">Tipo: {product.productType.name}</p>
                
                <h3 className="font-semibold mt-2">Presentaciones:</h3>
                <ul className="list-disc ml-5">
                  {product.presentations.map((p) => (
                    <li key={p.id}>
                      {p.description} — {p.unitLabel} — ${p.price}
                    </li>
                  ))}
                </ul>
                <h3 className="font-semibold mt-2">Inventario:</h3>
                {product.inventories.map((inv) => (
                  <p key={inv.id}>Cantidad: {inv.quantity}</p>
                ))}
              </div>
            }
            onEdit={() => handleEdit(product)}
            onDelete={() => handleDelete(product.id.toString())}
          />
        ))}
      </div>
    </div>
  );
}
