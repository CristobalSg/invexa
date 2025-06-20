// Importa hooks de React Query para manejo de datos asíncronos (fetch, mutate, cache).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Importa funciones del servicio que interactúan con el backend.
import { getProducts, createProduct, updateProduct, deleteProduct } from "../services/productService";

// Importa hooks y tipos
import { useState } from "react";
import type { Product } from "../types/product";

// Importa componentes reutilizables para productos
import { ProductCard } from "../components/ProductCard";
import { ProductModal } from "../components/ProductModal";

import { Menu, MenuButton, MenuItem, MenuItems} from '@headlessui/react'
import { ChevronDownIcon} from '@heroicons/react/20/solid'

// Estado inicial vacío del formulario (sin ID porque se añade al guardar)
const emptyForm = { name: "", quantity: 0, cost: 0, price: 0, barcode: "" };

export default function InvetoryPage() {
  const queryClient = useQueryClient(); // Permite invalidar caché y refetch

  // Consulta de productos (fetch inicial y refetch automático tras mutaciones)
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  // ESTADOS LOCALES
  const [form, setForm] = useState<Omit<Product, "id">>(emptyForm); // Formulario controlado
  const [editingId, setEditingId] = useState<string | null>(null); // ID de producto en edición
  const [showModal, setShowModal] = useState(false); // Modal no implementado en este archivo

  // Mutación para crear producto
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] }); // Refresca lista
      setForm(emptyForm); // Limpia el formulario
    },
  });

  // Mutación para actualizar producto
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Product, "id">> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingId(null);
      setForm(emptyForm);
    },
  });

  // Mutación para eliminar producto
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  // Maneja cambios en inputs del formulario
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "name" || name === "barcode" ? value : Number(value),
    }));
  }

  // Maneja envío del formulario (crear o actualizar)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  // Activa modo edición y llena el formulario con los datos del producto
  function handleEdit(product: Product) {
    setShowModal(true);
    setEditingId(product.id);
    setForm({
      name: product.name,
      quantity: product.quantity,
      cost: product.cost,
      price: product.price,
      barcode: product.barcode || "",
    });
  }

  // Elimina un producto (con confirmación)
  function handleDelete(id: string) {
    if (confirm("¿Seguro que deseas eliminar este producto?")) {
      deleteMutation.mutate(id);
    }
  }

  // Cancela la edición y limpia el formulario
  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div>
      {/* Encabezado con botón de "Crear producto" */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestión de Inventario</h1>
        <button
        onClick={() => {
          setShowModal(true);
          setEditingId(null); // Asegura que sea modo "crear"
          setForm(emptyForm);
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Crear producto
      </button>
      </div>

      {/* Formulario controlado */}
      <ProductModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        form={form}
        handleSubmit={handleSubmit}
        handleChange={handleChange}
        handleCancelEdit={handleCancelEdit}
        editingId={editingId}
      />

      {/* Indicadores de carga o error */}
      {isLoading && <p>Cargando productos...</p>}
      {error && <p className="text-red-500">Error al cargar productos</p>}

      {/* Lista de productos en una cuadrícula responsiva */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {products?.map((prod) => (
          <div key={prod.id}>
            <ProductCard
              name={prod.name}
              description={`Cantidad: ${prod.quantity} | Precio: $${prod.price}`}
              onEdit={() => handleEdit(prod)}
              onDelete={() => handleDelete(prod.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
