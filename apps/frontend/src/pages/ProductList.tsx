import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../services/productService";
import { useState } from "react";
import type { Product } from "../types/product";

const emptyForm = { name: "", quantity: 0, cost: 0, price: 0, barcode: "" };

export default function ProductList() {
  const queryClient = useQueryClient();
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const [form, setForm] = useState<Omit<Product, "id">>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Product, "id">> }) => updateProduct(id, data),
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "name" || name === "barcode" ? value : Number(value) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleEdit(product: Product) {
    setEditingId(product.id);
    setForm({ name: product.name, quantity: product.quantity, cost: product.cost, price: product.price, barcode: product.barcode || "" });
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
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Productos</h1>
      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-6 gap-2 items-end">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre" className="border p-2 rounded col-span-2" required />
        <input name="barcode" value={form.barcode} onChange={handleChange} placeholder="Código de barra" className="border p-2 rounded" required />
        <input name="quantity" type="text" value={form.quantity} onChange={handleChange} placeholder="Cantidad" className="border p-2 rounded" required />
        <input name="cost" type="text" value={form.cost} onChange={handleChange} placeholder="Costo" className="border p-2 rounded" required />
        <input name="price" type="text" value={form.price} onChange={handleChange} placeholder="Precio" className="border p-2 rounded" required />
        <div className="col-span-1 flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">{editingId ? "Actualizar" : "Agregar"}</button>
          {editingId && (
            <button type="button" onClick={handleCancelEdit} className="bg-gray-400 text-white px-4 py-2 rounded w-full">Cancelar</button>
          )}
        </div>
      </form>
      {isLoading && <p>Cargando productos...</p>}
      {error && <p className="text-red-500">Error al cargar productos</p>}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Nombre</th>
            <th className="border p-2">Código de barra</th>
            <th className="border p-2">Cantidad</th>
            <th className="border p-2">Costo</th>
            <th className="border p-2">Precio</th>
            <th className="border p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products?.map((prod) => (
            <tr key={prod.id}>
              <td className="border p-2">{prod.name}</td>
              <td className="border p-2">{prod.barcode}</td>
              <td className="border p-2">{prod.quantity}</td>
              <td className="border p-2">${prod.cost}</td>
              <td className="border p-2">${prod.price}</td>
              <td className="border p-2 flex gap-2">
                <button onClick={() => handleEdit(prod)} className="bg-yellow-400 px-2 py-1 rounded">Editar</button>
                <button onClick={() => handleDelete(prod.id)} className="bg-red-500 text-white px-2 py-1 rounded">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
