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
  const [messageType, setMessageType] = useState<"success"|"error">();

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        barCode: initialData.barCode || "",
        productTypeId: Number(initialData.productType.id),
        initialQuantity: initialData.inventories?.[0]?.quantity ?? 0,
        companyId: 1,
        presentation: {
          price: initialData.presentations?.[0]?.price ?? 0,
          unitLabel: initialData.presentations?.[0]?.unitLabel ?? "",
          description: initialData.presentations?.[0]?.description ?? "",
        },
      });
      console.log("Cargando initialData en form:", initialData);
    }
  }, [initialData]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;

    if (["price", "unitLabel", "description"].includes(name)) {
      setForm((prev) => {
        const updated = {
          ...prev,
          presentation: {
            ...prev.presentation,
            [name]: name === "price" ? Number(value) : value,
          },
        };
        console.log("Cambio en presentación:", name, value, updated);
        return updated;
      });
    } else {
      setForm((prev) => {
        const updated = {
          ...prev,
          [name]: ["productTypeId", "initialQuantity"].includes(name) ? Number(value) : value,
        };
        console.log("Cambio en form:", name, value, updated);
        return updated;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("Enviando form:", form);
    // Validación simple antes de enviar
    if (
      form.initialQuantity === undefined ||
      form.initialQuantity === null ||
      isNaN(Number(form.initialQuantity)) ||
      Number(form.initialQuantity) <= 0
    ) {
      setMessageType("error");
      setMessage("La cantidad inicial debe ser un número mayor a 0");
      return;
    }
    if (
      form.presentation.price === undefined ||
      form.presentation.price === null ||
      isNaN(Number(form.presentation.price)) ||
      Number(form.presentation.price) <= 0
    ) {
      setMessageType("error");
      setMessage("El precio debe ser un número mayor a 0");
      return;
    }
    try {
      if (initialData) {
        await updateProduct(initialData.id.toString(), {
          name: form.name,
          barCode: form.barCode,
          productTypeId: form.productTypeId,
          presentation: {
            id: initialData.presentations?.[0]?.id,
            price: form.presentation.price,
            unitLabel: form.presentation.unitLabel,
            description: form.presentation.description,
          },
          inventory: {
            id: initialData.inventories?.[0]?.id,
            quantity: form.initialQuantity,
          },
        });
        setMessageType("success");
        setMessage("Producto actualizado con éxito");
        setTimeout(() => setMessage(""), 3000);
        if (onSuccess) onSuccess();
      } else {
        await createProduct(form);
        setMessageType("success");
        setMessage("Producto creado con éxito");
        setTimeout(() => setMessage(""), 3000);
        setForm(initialState);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      setMessageType("error");
      let backendMsg = "Error al guardar el producto";
      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as { response?: { data?: { error?: string; message?: string } } };
        backendMsg = err.response?.data?.error || err.response?.data?.message || backendMsg;
      }
      setMessage(backendMsg);
      console.error(error);
    }
  }

  const inputClass = clsx(
    "mt-1 block w-full rounded-lg border-none bg-white/5 px-3 py-1.5 text-sm/6 text-white",
    "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
      {message && (
        <div className={`mb-2 text-center ${messageType === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} px-4 py-2 rounded font-semibold animate-fade-in`}>
          {message}
        </div>
      )}

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
          <option value={1}>Kilogramo</option>
          <option value={2}>Unidad</option>
        </select>
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Cantidad inicial</Label>
        <Input
          name="initialQuantity"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
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
          type="text"
          inputMode="decimal"
          pattern="[0-9.]*"
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
    </form>
  );
}
