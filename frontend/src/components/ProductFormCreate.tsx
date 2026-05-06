import { useEffect, useState } from "react";
import { Field, Input, Label } from "@headlessui/react";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { createProduct, updateProduct } from "../services/productService";
import { getCategorias, getProveedores } from "../services/catalogService";
import type { Producto, TipoPropiedadProducto } from "../types/api";

const initialState = {
  nombre: "",
  codigo_barras: "",
  categoria_id: 0,
  tipo_propiedad: "PROPIO" as TipoPropiedadProducto,
  proveedor_id: "",
  costo_actual: "",
  precio_venta: 0,
  stock: 0,
  activo: true,
};

interface ProductFormCreateProps {
  initialData?: Producto;
  onSuccess?: () => void;
}

export default function ProductFormCreate({
  initialData,
  onSuccess,
}: ProductFormCreateProps) {
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState("");
  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });
  const { data: proveedores } = useQuery({ queryKey: ["proveedores"], queryFn: () => getProveedores({ activo: true }) });

  useEffect(() => {
    if (initialData) {
      setForm({
        nombre: initialData.nombre,
        codigo_barras: initialData.codigo_barras || "",
        categoria_id: initialData.categoria_id,
        tipo_propiedad: initialData.tipo_propiedad,
        proveedor_id: initialData.proveedor_id ? String(initialData.proveedor_id) : "",
        costo_actual: initialData.costo_actual === null ? "" : String(initialData.costo_actual),
        precio_venta: initialData.precio_venta,
        stock: initialData.stock,
        activo: initialData.activo,
      });
    } else if (!form.categoria_id && categorias?.items[0]) {
      setForm((prev) => ({ ...prev, categoria_id: categorias.items[0].id }));
    }
  }, [initialData, categorias, form.categoria_id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ["categoria_id", "precio_venta", "stock"].includes(name) ? Number(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const input = {
        nombre: form.nombre,
        codigo_barras: form.codigo_barras || null,
        categoria_id: Number(form.categoria_id),
        tipo_propiedad: form.tipo_propiedad,
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        costo_actual: form.costo_actual === "" ? null : Number(form.costo_actual),
        precio_venta: Number(form.precio_venta),
        ...(initialData ? {} : { stock: Number(form.stock) }),
        activo: form.activo,
      };
      if (initialData) {
        await updateProduct(initialData.id , input);
        setMessage("Producto actualizado con éxito");
      } else {
        await createProduct(input);
        setMessage("Producto creado con éxito");
        setForm(initialState);
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      setMessage("Error al guardar el producto");
      console.error(error);
    }
  }

  const inputClass = clsx("mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900");

  return (
    <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
      <Field>
        <Label className="text-sm font-medium text-gray-700">Nombre</Label>
        <Input
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          className={inputClass}
          required
        />
      </Field>

      <Field>
        <Label className="text-sm font-medium text-gray-700">Código de barra</Label>
        <Input
          name="codigo_barras"
          value={form.codigo_barras}
          onChange={handleChange}
          className={inputClass}
        />
      </Field>

      <Field>
        <Label className="text-sm font-medium text-gray-700">Categoría</Label>
        <select
          name="categoria_id"
          value={form.categoria_id}
          onChange={handleChange}
          className={inputClass}
          required
        >
          {categorias?.items.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
        </select>
      </Field>

      <Field>
        <Label className="text-sm font-medium text-gray-700">Tipo de propiedad</Label>
        <select name="tipo_propiedad" value={form.tipo_propiedad} onChange={handleChange} className={inputClass}>
          <option value="PROPIO">Propio</option>
          <option value="CONSIGNACION">Consignación</option>
        </select>
      </Field>

      <Field>
        <Label className="text-sm font-medium text-gray-700">Proveedor</Label>
        <select name="proveedor_id" value={form.proveedor_id} onChange={handleChange} className={inputClass}>
          <option value="">Sin proveedor</option>
          {proveedores?.items.map((prov) => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
        </select>
      </Field>

      <Field>
        <Label className="text-sm font-medium text-gray-700">Costo actual</Label>
        <Input
          name="costo_actual"
          type="number"
          min={0}
          value={form.costo_actual}
          onChange={handleChange}
          className={inputClass}
        />
      </Field>

      <Field>
        <Label className="text-sm font-medium text-gray-700">Precio venta</Label>
        <Input
          name="precio_venta"
          type="number"
          min={1}
          value={form.precio_venta}
          onChange={handleChange}
          className={inputClass}
          required
        />
      </Field>

      {!initialData && (
        <Field>
          <Label className="text-sm font-medium text-gray-700">Stock inicial</Label>
          <Input name="stock" type="number" min={0} value={form.stock} onChange={handleChange} className={inputClass} />
        </Field>
      )}

      <div className="flex gap-2 justify-end pt-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {initialData ? "Guardar" : "Crear"}
        </button>
      </div>

      {message && <p className="text-center text-sm text-gray-700 mt-2">{message}</p>}
    </form>
  );
}
