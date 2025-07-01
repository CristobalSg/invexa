import { useState } from "react";
import axios from "axios";

const initialState = {
  name: "",
  productTypeId: 1,
  companyId: "1", // Asegúrate de usar el ID real de la compañía
  presentation: {
    description: "",
    baseQuantity: 1,
    price: 0,
    unitLabel: "",
    barCode: "",
  },
  initialQuantity: 0,
};

export default function CreateProductForm() {
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    if (name in form.presentation) {
      setForm((prev) => ({
        ...prev,
        presentation: {
          ...prev.presentation,
          [name]: name === "price" || name === "baseQuantity" ? Number(value) : value,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: name === "productTypeId" || name === "initialQuantity" ? Number(value) : value,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/products`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMessage("Producto creado con éxito");
      setForm(initialState);
    } catch (err) {
      setMessage("Error al crear el producto");
      console.error(err);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold">Crear Producto</h2>

      <input name="name" placeholder="Nombre" value={form.name} onChange={handleChange} className="w-full p-2 border rounded" />
      <input name="productTypeId" type="number" placeholder="ID tipo de producto" value={form.productTypeId} onChange={handleChange} className="w-full p-2 border rounded" />
      <input name="companyId" type="number" placeholder="Compañia id" value={form.companyId} onChange={handleChange} className="w-full p-2 border rounded" />

      <input name="description" placeholder="Descripción presentación" value={form.presentation.description} onChange={handleChange} className="w-full p-2 border rounded" />
      <input name="baseQuantity" type="number" placeholder="Cantidad base" value={form.presentation.baseQuantity} onChange={handleChange} className="w-full p-2 border rounded" />
      <input name="price" type="number" placeholder="Precio" value={form.presentation.price} onChange={handleChange} className="w-full p-2 border rounded" />
      <input name="unitLabel" placeholder="Unidad" value={form.presentation.unitLabel} onChange={handleChange} className="w-full p-2 border rounded" />
      <input name="initialQuantity" type="number" placeholder="Cantidad inicial" value={form.initialQuantity} onChange={handleChange} className="w-full p-2 border rounded" />
      <input name="barCode" placeholder="Código de barras" value={form.presentation.barCode} onChange={handleChange} className="w-full p-2 border rounded" />

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Crear</button>

      {message && <p className="mt-2 text-sm text-center">{message}</p>}
    </form>
  );
}
