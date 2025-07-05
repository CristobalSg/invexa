import React from "react";
import { Description, Field, Input, Label } from "@headlessui/react";
import clsx from "clsx";

// Ajustado al nuevo modelo de backend

type ProductFormProps = {
  form: {
    name: string;
    barCode: string;
    productTypeId: number;
    initialQuantity: number;
    presentation: {
      price: number;
      unitLabel?: string;
      description?: string;
    };
  };
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCancelEdit: () => void;
  editingId: string | null;
};

export const ProductForm: React.FC<ProductFormProps> = ({
  form,
  handleSubmit,
  handleCancelEdit,
  handleChange,
  editingId,
}) => {
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
          onChange={(e) =>
            handleChange({
              ...e,
              target: { ...e.target, name: "price" },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          className={inputClass}
          required
        />
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Unidad (opcional)</Label>
        <Input
          name="unitLabel"
          value={form.presentation.unitLabel ?? ""}
          onChange={(e) =>
            handleChange({
              ...e,
              target: { ...e.target, name: "unitLabel" },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          className={inputClass}
        />
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Descripción (opcional)</Label>
        <Input
          name="description"
          value={form.presentation.description ?? ""}
          onChange={(e) =>
            handleChange({
              ...e,
              target: { ...e.target, name: "description" },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          className={inputClass}
        />
      </Field>

      <div className="flex gap-2 justify-end pt-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {editingId ? "Actualizar" : "Agregar"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
};