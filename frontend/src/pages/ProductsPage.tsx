import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, deleteProduct } from "../services/productService";
import type { Producto } from "../types/api";

import { ProductModal } from "../components/ProductModal";
import { ProductCard } from "../components/ProductCard";
import ProductFormCreate from "../components/ProductFormCreate";
import { getStoredUser } from "../services/authService";

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Producto | null>(null);
  const [search, setSearch] = useState("");
  const isOwner = getStoredUser()?.rol === "OWNER";

  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products", search],
    queryFn: () => getProducts({ search: search || undefined, activo: true }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleEdit = (product: Producto) => {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestión de Inventario</h1>
        {isOwner && <button
          onClick={() => {
            setIsModalOpen(true);
            setProductToEdit(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Crear producto
        </button>}
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar productos"
        className="w-full max-w-lg border rounded px-3 py-2"
      />

      <ProductModal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ProductFormCreate
          initialData={productToEdit ?? undefined}
          onSuccess={handleSuccess}
        />
      </ProductModal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products?.items.map((product) => (
          <ProductCard
            key={product.id}
            name={product.nombre}
            description={
              <div>
                <p className="text-sm text-gray-500">
                  Código de barras: {product.codigo_barras ?? "Sin código"}
                </p>
                <p className="text-sm text-gray-500">
                  Categoría: {product.categoria_nombre}
                </p>
                <p className="text-sm text-gray-500">Propiedad: {product.tipo_propiedad}</p>
                <p className="text-sm text-gray-500">Proveedor: {product.proveedor_nombre ?? "No aplica"}</p>
                <p className="font-semibold mt-2">Stock: {product.stock}</p>
                <p className="font-semibold">Precio: ${product.precio_venta.toLocaleString()}</p>
              </div>
            }
            onEdit={isOwner ? () => handleEdit(product) : undefined}
            onDelete={isOwner ? () => handleDelete(product.id.toString()) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
