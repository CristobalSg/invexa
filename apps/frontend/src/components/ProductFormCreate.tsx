// src/components/ProductFormCreate.tsx
import { useEffect, useState } from "react";
import { Field, Input, Label } from "@headlessui/react";
import clsx from "clsx";
import { createProduct, updateProduct } from "../services/productService";
import type { Product } from "../types/product";

const initialState = {
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

interface ProductFormCreateProps {
  initialData?: Product;
  onSuccess?: () => void;
}

export default function ProductFormCreate({
  initialData,
  onSuccess,
}: ProductFormCreateProps) {
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        barCode: initialData.barCode || "",
        productTypeId: initialData.productType.id,
        initialQuantity: initialData.inventories?.[0]?.quantity ?? 0,
        companyId: 1,
        presentation: {
          price: initialData.presentations?.[0]?.price ?? 0,
          unitLabel: initialData.presentations?.[0]?.unitLabel ?? "",
          description: initialData.presentations?.[0]?.description ?? "",
        },
      });
    }
  }, [initialData]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;

    if (["price", "unitLabel", "description"].includes(name)) {
      setForm((prev) => ({
        ...prev,
        presentation: {
          ...prev.presentation,
          [name]: name === "price" ? Number(value) : value,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: ["productTypeId", "initialQuantity"].includes(name) ? Number(value) : value,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (initialData) {
        await updateProduct(initialData.id , form);
        setMessage("Producto actualizado con éxito");
      } else {
        await createProduct(form);
        setMessage("Producto creado con éxito");
        setForm(initialState);
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      setMessage("Error al guardar el producto");
      console.error(error);
    }
  }

  const inputClass = clsx(
    "mt-1 block w-full rounded-lg border-none bg-white/5 px-3 py-1.5 text-sm/6 text-white",
    "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
      <Field>
        <Label className="text-sm/6 font-medium text-white">Nombre</Label>
        <Input
          name="name"
          value={form.name}
          onChange={handleChange}
          className={inputClass}
          required
        />
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Código de barra</Label>
        <Input
          name="barCode"
          value={form.barCode}
          onChange={handleChange}
          className={inputClass}
          required
        />
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Tipo de producto</Label>
        <select
          name="productTypeId"
          value={form.productTypeId}
          onChange={handleChange}
          className={inputClass}
          required
        >
          <option value={1}>Unidad</option>
          <option value={2}>Kilogramo</option>
        </select>
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Cantidad inicial</Label>
        <Input
          name="initialQuantity"
          type="number"
          value={form.initialQuantity}
          onChange={handleChange}
          className={inputClass}
          required
        />
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Precio</Label>
        <Input
          name="price"
          type="number"
          value={form.presentation.price}
          onChange={handleChange}
          className={inputClass}
          required
        />
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Unidad (opcional)</Label>
        <Input
          name="unitLabel"
          value={form.presentation.unitLabel}
          onChange={handleChange}
          className={inputClass}
        />
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Descripción (opcional)</Label>
        <Input
          name="description"
          value={form.presentation.description}
          onChange={handleChange}
          className={inputClass}
        />
      </Field>

      <div className="flex gap-2 justify-end pt-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {initialData ? "Guardar" : "Crear"}
        </button>
      </div>

      {message && (
        <p className="text-center text-sm text-white mt-2">{message}</p>
      )}
    </form>
  );
}
