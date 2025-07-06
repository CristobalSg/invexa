// ProductsPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, deleteProduct } from "../services/productService";
import type { Product } from "../types/product";

import { ProductModal } from "../components/ProductModal";
import { ProductCard } from "../components/ProductCard";
import ProductFormCreate from "../components/ProductFormCreate";

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

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
    setProductToEdit(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductToEdit(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    handleCloseModal();
  };

  if (isLoading) return <p>Cargando productos...</p>;
  if (error) return <p className="text-red-500">Error al cargar productos</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestión de Inventario</h1>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setProductToEdit(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Crear producto
        </button>
      </div>

      <ProductModal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ProductFormCreate
          initialData={productToEdit ?? undefined}
          onSuccess={handleSuccess}
        />
      </ProductModal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products?.map((product) => (
          <ProductCard
            key={product.id}
            name={product.name}
            description={
              <div>
                <p className="text-sm text-gray-500">
                  Código de barras: {product.barCode}
                </p>
                <p className="text-sm text-gray-500">
                  Tipo: {product.productType.name}
                </p>

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
