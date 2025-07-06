// ProductsPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, deleteProduct } from "../services/productService";
import type { Product } from "../types/product";
import axios from "axios";

import { ProductModal } from "../components/ProductModal";
import { ProductCard } from "../components/ProductCard";
import ProductFormCreate from "../components/ProductFormCreate";

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">();

  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setMessageType("success");
      setMessage("Producto eliminado con éxito");
      setTimeout(() => setMessage(""), 3000);
    },
    onError: (error) => {
      setMessageType("error");
      let msg = "Error al eliminar producto";
      if (axios.isAxiosError(error)) {
        msg = error.response?.data?.error || error.response?.data?.message || msg;
      }
      setMessage(msg);
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

  // Asegura que products sea siempre un array para evitar errores con .map
  const safeProducts = Array.isArray(products) ? products : [];

  if (isLoading) return <p>Cargando productos...</p>;
  if (error) return <p className="text-red-500">Error al cargar productos</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {message && (
        <div
          className={`mb-4 text-center ${
            messageType === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          } px-4 py-2 rounded font-semibold animate-fade-in`}
        >
          {message}
        </div>
      )}

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
        {safeProducts.map((product) => (
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
