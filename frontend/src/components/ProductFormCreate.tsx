import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { createProduct, updateProduct } from "../services/productService";
import { getCategorias, getProveedores } from "../services/catalogService";
import type { ModoInventarioProducto, Producto, TipoPropiedadProducto, UnidadVentaProducto } from "../types/api";
import { Button, FormActions, FormField, inputClassName } from "./FormControls";

const initialState = {
  nombre: "",
  codigo_barras: "",
  categoria_id: 0,
  tipo_propiedad: "PROPIO" as TipoPropiedadProducto,
  unidad_venta: "UNIDAD" as UnidadVentaProducto,
  modo_inventario: "FLEXIBLE" as ModoInventarioProducto,
  proveedor_id: "",
  costo_actual: "",
  precio_venta: "",
  stock: "",
  ingreso_por_caja: false,
  costo_caja: "",
  cantidad_cajas: "1",
  cantidad_por_caja: "",
  activo: true,
};

const classificationStorageKey = "inventory-product-classification";

type StoredClassification = Pick<
  typeof initialState,
  "categoria_id" | "tipo_propiedad" | "unidad_venta" | "modo_inventario" | "proveedor_id"
>;

const readStoredClassification = (): Partial<StoredClassification> => {
  try {
    const stored = window.localStorage.getItem(classificationStorageKey);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Partial<StoredClassification>;
    const classification: Partial<StoredClassification> = {};

    if (Number(parsed.categoria_id) > 0) {
      classification.categoria_id = Number(parsed.categoria_id);
    }

    if (parsed.tipo_propiedad === "PROPIO" || parsed.tipo_propiedad === "CONSIGNACION") {
      classification.tipo_propiedad = parsed.tipo_propiedad;
    }

    if (parsed.unidad_venta === "UNIDAD" || parsed.unidad_venta === "PESO") {
      classification.unidad_venta = parsed.unidad_venta;
    }

    if (
      parsed.modo_inventario === "SIN_INVENTARIO" ||
      parsed.modo_inventario === "FLEXIBLE" ||
      parsed.modo_inventario === "ESTRICTO"
    ) {
      classification.modo_inventario = parsed.modo_inventario;
    }

    if (typeof parsed.proveedor_id === "string") {
      classification.proveedor_id = parsed.proveedor_id;
    }

    return classification;
  } catch {
    return {};
  }
};

const createInitialFormState = () => ({
  ...initialState,
  ...readStoredClassification(),
});

const storeClassification = (form: typeof initialState) => {
  window.localStorage.setItem(
    classificationStorageKey,
    JSON.stringify({
      categoria_id: form.categoria_id,
      tipo_propiedad: form.tipo_propiedad,
      unidad_venta: form.unidad_venta,
      modo_inventario: form.modo_inventario,
      proveedor_id: form.tipo_propiedad === "CONSIGNACION" ? form.proveedor_id : "",
    } satisfies StoredClassification),
  );
};

const toStockFormValue = (product: Producto) => {
  if (product.unidad_venta === "PESO") {
    return String(Number((product.stock * 1000).toFixed(3)));
  }

  return String(product.stock);
};

interface ProductFormCreateProps {
  initialData?: Producto;
  onSuccess?: () => void;
}

export default function ProductFormCreate({
  initialData,
  onSuccess,
}: ProductFormCreateProps) {
  const [form, setForm] = useState(createInitialFormState);
  const [message, setMessage] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });
  const { data: proveedores } = useQuery({ queryKey: ["proveedores"], queryFn: () => getProveedores({ activo: true }) });

  useEffect(() => {
    const focusTimer = window.setTimeout(() => barcodeInputRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        nombre: initialData.nombre,
        codigo_barras: initialData.codigo_barras || "",
        categoria_id: initialData.categoria_id,
        tipo_propiedad: initialData.tipo_propiedad,
        unidad_venta: initialData.unidad_venta,
        modo_inventario: initialData.modo_inventario,
        proveedor_id: initialData.proveedor_id ? String(initialData.proveedor_id) : "",
        costo_actual: initialData.costo_actual === null ? "" : String(initialData.costo_actual),
        precio_venta: String(initialData.precio_venta),
        stock: toStockFormValue(initialData),
        ingreso_por_caja: false,
        costo_caja: "",
        cantidad_cajas: "1",
        cantidad_por_caja: "",
        activo: initialData.activo,
      });
    } else if (!form.categoria_id && categorias?.items[0]) {
      setForm((prev) => ({ ...prev, categoria_id: categorias.items[0].id }));
    }
  }, [initialData, categorias, form.categoria_id]);

  const selectedCategoria = categorias?.items.find((cat) => cat.id === Number(form.categoria_id));
  const packageCost = Number(form.costo_caja);
  const packageCount = Number(form.cantidad_cajas || 1);
  const packageUnits = Number(form.cantidad_por_caja);
  const packageTotalUnits = packageCount > 0 && packageUnits > 0 ? packageCount * packageUnits : 0;
  const packageSellUnits = form.unidad_venta === "PESO" ? packageUnits / 1000 : packageUnits;
  const packageUnitCost = packageCost > 0 && packageSellUnits > 0 ? packageCost / packageSellUnits : 0;
  const suggestedPrice =
    packageUnitCost > 0 && selectedCategoria
      ? Math.round(packageUnitCost * selectedCategoria.multiplicador_ganancia)
      : 0;

  useEffect(() => {
    if (initialData || !form.ingreso_por_caja) return;

    setForm((prev) => ({
      ...prev,
      stock: packageTotalUnits > 0 ? String(packageTotalUnits) : "",
      costo_actual: packageUnitCost > 0 ? String(Number(packageUnitCost.toFixed(2))) : "",
      precio_venta: suggestedPrice > 0 ? String(suggestedPrice) : prev.precio_venta,
    }));
  }, [initialData, form.ingreso_por_caja, packageTotalUnits, packageUnitCost, suggestedPrice]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    const checked = e.target instanceof HTMLInputElement ? e.target.checked : false;
    setForm((prev) => {
      if (name === "proveedor_id") {
        return {
          ...prev,
          proveedor_id: value,
          tipo_propiedad: value ? "CONSIGNACION" : prev.tipo_propiedad,
        };
      }

      if (name === "tipo_propiedad") {
        const tipo_propiedad = value as TipoPropiedadProducto;
        return {
          ...prev,
          tipo_propiedad,
          proveedor_id: tipo_propiedad === "PROPIO" ? "" : prev.proveedor_id,
        };
      }

      if (name === "ingreso_por_caja") {
        return {
          ...prev,
          ingreso_por_caja: checked,
          cantidad_cajas: checked && !prev.cantidad_cajas ? "1" : prev.cantidad_cajas,
        };
      }

      return {
        ...prev,
        [name]: name === "categoria_id" ? Number(value) : value,
      };
    });
  }

  function focusOnEnter(event: KeyboardEvent<HTMLInputElement>, nextInput: HTMLInputElement | null) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    nextInput?.focus();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.tipo_propiedad === "CONSIGNACION" && !form.proveedor_id) {
      setMessage("Selecciona un proveedor para productos en consignación");
      return;
    }
    if (form.precio_venta === "" || Number(form.precio_venta) <= 0) {
      setMessage("Ingresa un precio de venta mayor a 0");
      return;
    }
    if (!initialData && form.ingreso_por_caja && packageTotalUnits <= 0) {
      setMessage("Ingresa cuántas cajas son y cuántas unidades trae cada caja");
      return;
    }

    try {
      const stockInicial =
        form.unidad_venta === "PESO"
          ? Number(form.stock || 0) / 1000
          : Number(form.stock || 0);
      const input = {
        nombre: form.nombre,
        codigo_barras: form.codigo_barras || null,
        categoria_id: Number(form.categoria_id),
        tipo_propiedad: form.tipo_propiedad,
        unidad_venta: form.unidad_venta,
        modo_inventario: form.modo_inventario,
        proveedor_id: form.tipo_propiedad === "CONSIGNACION" && form.proveedor_id ? Number(form.proveedor_id) : null,
        costo_actual: form.costo_actual === "" ? null : Number(form.costo_actual),
        precio_venta: Number(form.precio_venta),
        stock: stockInicial,
        activo: form.activo,
      };
      if (initialData) {
        await updateProduct(initialData.id , input);
        setMessage("Producto actualizado con éxito");
      } else {
        await createProduct(input);
        storeClassification(form);
        setMessage("Producto creado con éxito");
        setForm({
          ...createInitialFormState(),
          nombre: "",
          codigo_barras: "",
          costo_actual: "",
          precio_venta: "",
          stock: "",
          ingreso_por_caja: false,
          costo_caja: "",
          cantidad_cajas: "1",
          cantidad_por_caja: "",
          activo: true,
        });
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      setMessage("Error al guardar el producto");
      console.error(error);
    }
  }

  const stockUnitLabel = form.unidad_venta === "PESO" ? "gramos" : "unidades";
  const costUnitLabel = form.unidad_venta === "PESO" ? "Costo por kg" : "Costo unitario";

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <section className="product-form-section">
        <div className="product-form-section-head">
          <h3>Datos básicos</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Código de barra">
            <input
              ref={barcodeInputRef}
              name="codigo_barras"
              value={form.codigo_barras}
              onChange={handleChange}
              onKeyDown={(event) => focusOnEnter(event, nameInputRef.current)}
              className={inputClassName}
            />
          </FormField>

          <FormField label="Nombre">
            <input
              ref={nameInputRef}
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              onKeyDown={(event) => focusOnEnter(event, priceInputRef.current)}
              className={inputClassName}
              required
            />
          </FormField>
        </div>
      </section>

      <section className="product-form-section">
        <div className="product-form-section-head">
          <h3>Clasificación</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Categoría">
            <select
              name="categoria_id"
              value={form.categoria_id}
              onChange={handleChange}
              className={inputClassName}
              required
            >
              {categorias?.items.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
            </select>
          </FormField>

          <FormField label="Tipo de propiedad">
            <select name="tipo_propiedad" value={form.tipo_propiedad} onChange={handleChange} className={inputClassName}>
              <option value="PROPIO">Propio</option>
              <option value="CONSIGNACION">Consignación</option>
            </select>
          </FormField>

          <FormField label="Unidad de venta">
            <select name="unidad_venta" value={form.unidad_venta} onChange={handleChange} className={inputClassName}>
              <option value="UNIDAD">Unidad</option>
              <option value="PESO">Peso</option>
            </select>
          </FormField>

          <FormField label="Modo de inventario">
            <select name="modo_inventario" value={form.modo_inventario} onChange={handleChange} className={inputClassName}>
              <option value="SIN_INVENTARIO">Sin inventario</option>
              <option value="FLEXIBLE">Inventario flexible</option>
              <option value="ESTRICTO">Inventario estricto</option>
            </select>
          </FormField>

          <FormField
            label="Proveedor"
            className="md:col-span-2"
            help={form.tipo_propiedad === "PROPIO" ? "Los productos propios no usan proveedor." : undefined}
          >
            <select
              name="proveedor_id"
              value={form.proveedor_id}
              onChange={handleChange}
              className={inputClassName}
              required={form.tipo_propiedad === "CONSIGNACION"}
              disabled={form.tipo_propiedad === "PROPIO"}
            >
              <option value="">Sin proveedor</option>
              {proveedores?.items.map((prov) => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
            </select>
          </FormField>
        </div>
      </section>

      {!initialData && (
        <section className="product-form-section product-form-package">
          <label className="product-form-toggle">
            <input
              name="ingreso_por_caja"
              type="checkbox"
              checked={form.ingreso_por_caja}
              onChange={handleChange}
            />
            <span>Ingresar por caja</span>
          </label>

          {form.ingreso_por_caja && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FormField label="Costo de la caja">
                <input
                  name="costo_caja"
                  type="number"
                  min={0}
                  value={form.costo_caja}
                  onChange={handleChange}
                  className={inputClassName}
                />
              </FormField>

              <FormField label={`${stockUnitLabel} por caja`}>
                <input
                  name="cantidad_por_caja"
                  type="number"
                  min={0}
                  step={form.unidad_venta === "PESO" ? 1 : 0.001}
                  value={form.cantidad_por_caja}
                  onChange={handleChange}
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Cantidad de cajas">
                <input
                  name="cantidad_cajas"
                  type="number"
                  min={1}
                  step={1}
                  value={form.cantidad_cajas}
                  onChange={handleChange}
                  className={inputClassName}
                />
              </FormField>

              <div className="product-form-calcs md:col-span-3">
                <span>Stock calculado: {packageTotalUnits || 0} {stockUnitLabel}</span>
                <span>{costUnitLabel}: {packageUnitCost > 0 ? `$${packageUnitCost.toFixed(2)}` : "$0"}</span>
                <span>Precio sugerido: {suggestedPrice > 0 ? `$${suggestedPrice}` : "$0"}</span>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="product-form-section">
        <div className="product-form-section-head">
          <h3>Inventario y precio</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <FormField label={costUnitLabel}>
            <input
              name="costo_actual"
              type="number"
              min={0}
              value={form.costo_actual}
              onChange={handleChange}
              className={inputClassName}
            />
          </FormField>

          <FormField label="Precio venta">
            <input
              ref={priceInputRef}
              name="precio_venta"
              type="number"
              min={1}
              value={form.precio_venta}
              onChange={handleChange}
              onKeyDown={(event) => focusOnEnter(event, stockInputRef.current)}
              className={inputClassName}
              placeholder="Precio de venta"
              required
            />
          </FormField>

          <FormField
            label={`${initialData ? "Stock actual" : "Stock inicial"} (${stockUnitLabel})`}
            help={form.unidad_venta === "PESO" ? "Ingresa gramos. Ejemplo: 1000 equivale a 1 kg." : undefined}
          >
            <input
              ref={stockInputRef}
              name="stock"
              type="number"
              min={0}
              step={form.unidad_venta === "PESO" ? 1 : 0.001}
              value={form.stock}
              onChange={handleChange}
              className={inputClassName}
              placeholder={form.unidad_venta === "PESO" ? "Ej: 1000" : "Stock inicial"}
              disabled={!initialData && form.ingreso_por_caja}
            />
          </FormField>
        </div>
      </section>

      {message && <p className="product-form-message">{message}</p>}

      <FormActions className="product-form-actions">
        <Button type="submit">
          {initialData ? "Guardar cambios" : "Crear producto"}
        </Button>
      </FormActions>
    </form>
  );
}
