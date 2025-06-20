import React from "react";
import { Description, Field, Input, Label } from "@headlessui/react";
import clsx from "clsx";

type ProductFormProps = {
  form: {
    name: string;
    barcode?: string;
    quantity: string;
    cost: string;
    price: string;
  };
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    <form
      onSubmit={handleSubmit}
      className="space-y-4 flex flex-col"
    >
      <Field>
        <Label className="text-sm/6 font-medium text-white">Nombre</Label>
        <Description className="text-sm/6 text-white/50">Nombre del producto</Description>
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
        <Description className="text-sm/6 text-white/50">Escanéalo o escríbelo</Description>
        <Input
          name="barcode"
          value={form.barcode ?? ""}
          onChange={handleChange}
          className={inputClass}
          required
        />
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Cantidad</Label>
        <Input
          name="quantity"
          type="text"
          value={form.quantity}
          onChange={handleChange}
          className={inputClass}
          required
        />
      </Field>

      <Field>
        <Label className="text-sm/6 font-medium text-white">Costo</Label>
        <Input
          name="cost"
          type="text"
          value={form.cost}
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
          value={form.price}
          onChange={handleChange}
          className={inputClass}
          required
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
