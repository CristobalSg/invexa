import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Product } from "../types/product";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../services/productService";
import { ProductCard } from "../components/ProductCard";
import { ProductModal } from "../components/ProductModal";
import { ProductForm } from "../components/ProductForm";

const emptyForm = {
  name: "",
  barCode: "",
  productTypeId: 1,
  initialQuantity: 0,
  companyId: 1,
  presentation: {
    price: 0,
    unitLabel: "",
    description: "",
  },
};

export default function InventoryPage() {
  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof emptyForm> }) => {
      // Buscar el producto original para obtener los ids necesarios
      const product = products?.find((p) => p.id.toString() === id);
      return updateProduct(id, {
        name: data.name,
        barCode: data.barCode,
        productTypeId: data.productTypeId,
        presentation: product && product.presentations[0] ? {
          id: product.presentations[0].id,
          price: data.presentation?.price,
          unitLabel: data.presentation?.unitLabel,
          description: data.presentation?.description,
        } : undefined,
        inventory: product && product.inventories[0] ? {
          id: product.inventories[0].id,
          quantity: data.initialQuantity,
        } : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingId(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;

    if (name.startsWith("presentation.")) {
      const key = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        presentation: {
          ...prev.presentation,
          [key]: key === "price" ? Number(value) : value,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: name === "productTypeId" || name === "initialQuantity" ? Number(value) : value,
      }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
    setShowModal(false);
  }

  function handleEdit(product: Product) {
    setShowModal(true);
    setEditingId(product.id.toString());
    const firstPresentation = product.presentations[0] || { price: 0 };

    setForm({
      name: product.name,
      barCode: product.barCode,
      productTypeId: product.productType.id,
      initialQuantity: product.inventories[0]?.quantity || 0,
      companyId: 1,
      presentation: {
        price: firstPresentation.price,
        unitLabel: firstPresentation.unitLabel || "",
        description: firstPresentation.description || "",
      },
    });
  }

  function handleDelete(id: string) {
    if (confirm("¿Seguro que deseas eliminar este producto?")) {
      deleteMutation.mutate(id);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestión de Inventario</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setEditingId(null);
            setForm(emptyForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Crear producto
        </button>
      </div>

      <ProductModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      >
        <ProductForm
          form={form}
          handleSubmit={handleSubmit}
          handleChange={handleChange}
          handleCancelEdit={handleCancelEdit}
          editingId={editingId}
        />
      </ProductModal>

      {isLoading && <p>Cargando productos...</p>}
      {error && <p className="text-red-500">Error al cargar productos</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {products?.map((prod) => (
          <ProductCard
            key={prod.id}
            name={prod.name}
            description={`Stock: ${prod.inventories[0]?.quantity ?? 0} | Precio: $${prod.presentations[0]?.price ?? 0}`}
            onEdit={() => handleEdit(prod)}
            onDelete={() => handleDelete(prod.id.toString())}
          />
        ))}
      </div>
    </div>
  );
}
