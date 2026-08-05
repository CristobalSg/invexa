import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardDocumentListIcon, ReceiptRefundIcon } from "@heroicons/react/24/outline";
import { anularCompra, createCompra, getCompra, getCompras } from "../services/compraService";
import { authorizeAdmin } from "../services/authService";
import { getCategorias } from "../services/catalogService";
import { getProductByBarcode, getProducts } from "../services/productService";
import type { Producto } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, FormActions, FormField, inputClassName } from "../components/FormControls";

type CompraItemForm = {
  producto: Producto;
  cantidad: string;
  costo_unitario: string;
  precio_final: string;
  actualizar_precio_venta: boolean;
  unlocked: boolean;
};

type MasterAction =
  | { type: "unlock-item"; productId: number }
  | { type: "remove-item"; productId: number }
  | { type: "clear-items" }
  | { type: "cancel-purchase"; compraId: number; motivo: string };

const money = (value: number) => `$${value.toLocaleString()}`;
const toNumber = (value: string) => Number(value) || 0;
const isWeightProduct = (product: Producto) => product.unidad_venta === "PESO";
const initialQuantity = (product: Producto) => (isWeightProduct(product) ? "1000" : "1");
const quantityStep = (product: Producto) => (isWeightProduct(product) ? 1 : 1);
const quantityMin = (product: Producto) => (isWeightProduct(product) ? 1 : 1);
const quantityForBackend = (item: CompraItemForm) => {
  const quantity = toNumber(item.cantidad);
  return isWeightProduct(item.producto) ? quantity / 1000 : quantity;
};
const quantityLabel = (product: Producto) => (isWeightProduct(product) ? "Gramos" : "Unidades");
const createItemValidationMessage = (item: CompraItemForm) => {
  if (quantityForBackend(item) <= 0) {
    return `${item.producto.nombre}: ingresa una cantidad mayor a 0.`;
  }

  if (toNumber(item.costo_unitario) <= 0) {
    return `${item.producto.nombre}: ingresa el costo unitario.`;
  }

  if (item.actualizar_precio_venta && toNumber(item.precio_final) <= 0) {
    return `${item.producto.nombre}: ingresa el precio de venta o desmarca actualizar precio.`;
  }

  return null;
};

export default function ComprasPage() {
  const queryClient = useQueryClient();
  const { data: productos } = useQuery({ queryKey: ["products"], queryFn: () => getProducts({ activo: true, limit: 100 }) });
  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });
  const { data: compras } = useQuery({ queryKey: ["compras"], queryFn: () => getCompras() });

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [items, setItems] = useState<CompraItemForm[]>([]);
  const [message, setMessage] = useState("");
  const [masterAction, setMasterAction] = useState<MasterAction | null>(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [expandedCompraId, setExpandedCompraId] = useState<number | null>(null);

  const compraDetalle = useQuery({
    queryKey: ["compra", expandedCompraId],
    queryFn: () => getCompra(expandedCompraId as number),
    enabled: expandedCompraId !== null,
  });

  const productosFiltrados = useMemo(() => {
    const normalizedName = nombre.trim().toLowerCase();
    return (productos?.items ?? [])
      .filter((product) => !categoriaId || product.categoria_id === Number(categoriaId))
      .filter((product) => {
        if (!normalizedName) return true;
        return (
          product.nombre.toLowerCase().includes(normalizedName) ||
          (product.codigo_barras ?? "").toLowerCase().includes(normalizedName)
        );
      })
      .slice(0, 12);
  }, [categoriaId, nombre, productos?.items]);

  const totalCompra = items.reduce(
    (total, item) => total + quantityForBackend(item) * toNumber(item.costo_unitario),
    0,
  );

  const addProduct = (product: Producto) => {
    setMessage("");
    setItems((prev) => {
      const index = prev.findIndex((item) => item.producto.id === product.id);
      if (index >= 0) {
        const updated = [...prev];
        const currentQuantity = toNumber(updated[index].cantidad);
        updated[index] = {
          ...updated[index],
          cantidad: String(currentQuantity + toNumber(initialQuantity(product))),
        };
        return updated;
      }

      return [
        ...prev,
        {
          producto: product,
          cantidad: initialQuantity(product),
          costo_unitario: product.costo_actual === null ? "" : String(product.costo_actual),
          precio_final: String(product.precio_venta),
          actualizar_precio_venta: true,
          unlocked: true,
        },
      ];
    });
  };

  const handleBarcodeAdd = async () => {
    const barcode = codigo.trim();
    if (!barcode) return;

    const product = await getProductByBarcode(barcode);
    if (!product) {
      setMessage("No se encontró un producto con ese código. Puedes buscarlo por nombre o categoría.");
      return;
    }

    addProduct(product);
    setCodigo("");
  };

  const updateItem = (productId: number, patch: Partial<CompraItemForm>) => {
    setItems((prev) =>
      prev.map((item) => (item.producto.id === productId ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((item) => item.producto.id !== productId));
  };

  const closeMasterModal = () => {
    setMasterAction(null);
    setMasterPassword("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      createCompra({
        items: items.map((item) => ({
          producto_id: item.producto.id,
          cantidad: quantityForBackend(item),
          costo_unitario: toNumber(item.costo_unitario),
          precio_final: item.actualizar_precio_venta && item.precio_final !== "" ? toNumber(item.precio_final) : undefined,
          actualizar_precio_venta: item.actualizar_precio_venta,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setItems([]);
      closeMasterModal();
      setMessage("Compra registrada.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo registrar compra"),
  });

  const anulacion = useMutation({
    mutationFn: ({ id, motivo, password }: { id: number; motivo: string; password: string }) => anularCompra(id, motivo, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeMasterModal();
      setMessage("Compra anulada.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo anular compra"),
  });

  const canSubmit =
    items.length > 0 &&
    items.every((item) => createItemValidationMessage(item) === null);

  const confirmMasterAction = async () => {
    if (!masterAction || !masterPassword) return;

    try {
      await authorizeAdmin(masterPassword);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo autorizar");
      return;
    }

    if (masterAction.type === "unlock-item") {
      setItems((prev) =>
        prev.map((item) =>
          item.producto.id === masterAction.productId ? { ...item, unlocked: true } : item,
        ),
      );
      closeMasterModal();
      return;
    }

    if (masterAction.type === "remove-item") {
      removeItem(masterAction.productId);
      closeMasterModal();
      return;
    }

    if (masterAction.type === "clear-items") {
      setItems([]);
      closeMasterModal();
      return;
    }

    anulacion.mutate({ id: masterAction.compraId, motivo: masterAction.motivo, password: masterPassword });
  };

  const handleSubmitCompra = () => {
    if (items.length === 0) {
      setMessage("Agrega al menos un producto a la compra.");
      return;
    }

    const validationMessage = items.map(createItemValidationMessage).find(Boolean);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compras</h1>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <div className="xl:sticky xl:top-6 xl:self-start">
      <ModuleCard
        title="Registrar compra"
        description="Agrega productos por código, nombre o categoría antes de registrar."
        icon={ClipboardDocumentListIcon}
        action={(
          <div className="text-right">
            <p className="text-xs text-gray-500">Total costo</p>
            <p className="text-2xl font-bold text-gray-900">{money(totalCompra)}</p>
          </div>
        )}
        contentClassName="p-5"
      >
        <div className="space-y-5">

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr_220px]">
          <FormField label="Código de barra">
            <input
              autoFocus
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleBarcodeAdd();
              }}
              className={inputClassName}
              placeholder="Escanear o escribir código"
            />
          </FormField>
          <Button onClick={handleBarcodeAdd} className="self-end">
            Agregar
          </Button>
          <FormField label="Nombre">
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className={inputClassName}
              placeholder="Buscar por nombre"
            />
          </FormField>
          <FormField label="Categoría">
            <select
              value={categoriaId}
              onChange={(event) => setCategoriaId(event.target.value)}
              className={inputClassName}
            >
              <option value="">Todas</option>
              {categorias?.items.map((category) => (
                <option key={category.id} value={category.id}>{category.nombre}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {productosFiltrados.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => addProduct(product)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="text-sm font-semibold text-gray-900">{product.nombre}</p>
              <p className="text-xs text-gray-500">
                {product.codigo_barras ?? "Sin código"} · {product.categoria_nombre} · Stock {product.stock}
                {product.unidad_venta === "PESO" ? " kg" : ""}
              </p>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="p-3">Producto</th>
                <th>Cantidad</th>
                <th>Costo unitario</th>
                <th>Precio venta</th>
                <th>Actualizar precio</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const subtotal = quantityForBackend(item) * toNumber(item.costo_unitario);

                return (
                  <tr key={item.producto.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{item.producto.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {item.producto.codigo_barras ?? "Sin código"} · {item.producto.unidad_venta === "PESO" ? "Peso" : "Unidad"}
                      </p>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={quantityMin(item.producto)}
                        step={quantityStep(item.producto)}
                        value={item.cantidad}
                        onChange={(event) => updateItem(item.producto.id, { cantidad: event.target.value })}
                        disabled={!item.unlocked}
                        className="w-24 border rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-500"
                        aria-label={quantityLabel(item.producto)}
                      />
                      <p className="mt-1 text-xs text-gray-500">{quantityLabel(item.producto)}</p>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={item.costo_unitario}
                        onChange={(event) => updateItem(item.producto.id, { costo_unitario: event.target.value })}
                        disabled={!item.unlocked}
                        className="w-32 border rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="Costo"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={item.precio_final}
                        onChange={(event) => updateItem(item.producto.id, { precio_final: event.target.value })}
                        disabled={!item.unlocked}
                        className="w-32 border rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="Precio"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.actualizar_precio_venta}
                        onChange={(event) => updateItem(item.producto.id, { actualizar_precio_venta: event.target.checked })}
                        disabled={!item.unlocked}
                      />
                    </td>
                    <td className="font-semibold">{money(subtotal)}</td>
                    <td>
                      <div className="flex gap-2">
                        {item.unlocked ? (
                          <button
                            onClick={() => updateItem(item.producto.id, { unlocked: false })}
                            className="text-blue-700 font-semibold"
                          >
                            Listo
                          </button>
                        ) : (
                          <button
                            onClick={() => setMasterAction({ type: "unlock-item", productId: item.producto.id })}
                            className="text-blue-700 font-semibold"
                          >
                            Modificar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (item.unlocked) {
                              removeItem(item.producto.id);
                              return;
                            }
                            setMasterAction({ type: "remove-item", productId: item.producto.id });
                          }}
                          className="text-red-600 font-semibold"
                        >
                          Quitar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">Agrega productos a la compra.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setMasterAction({ type: "clear-items" })}
            disabled={items.length === 0}
          >
            Limpiar
          </Button>
          <Button
            disabled={items.length === 0 || mutation.isPending}
            onClick={handleSubmitCompra}
          >
            {mutation.isPending ? "Registrando..." : "Registrar compra"}
          </Button>
        </div>

        {items.length > 0 && !canSubmit && (
          <p className="text-sm text-amber-700">
            Completa cantidad, costo unitario y precio de venta en los productos que actualizarán precio.
          </p>
        )}

        {message && <p className="text-sm">{message}</p>}
        </div>
      </ModuleCard>
        </div>

        <div>
      <ListPanel
        title="Compras recientes"
        icon={ClipboardDocumentListIcon}
        emptyMessage="Sin compras registradas."
        items={(compras?.items ?? []).map((compra) => ({
          id: compra.id,
          icon: ReceiptRefundIcon,
          title: `Compra #${compra.id}`,
          description: compra.usuario_nombre,
          meta: [new Date(compra.creado_en).toLocaleString(), compra.estado],
          amount: money(compra.total_costo),
          action: (
            <div className="flex gap-2">
              <button
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                onClick={() => setExpandedCompraId((current) => (current === compra.id ? null : compra.id))}
              >
                {expandedCompraId === compra.id ? "Ocultar" : "Ver detalle"}
              </button>
              {compra.estado === "COMPLETADA" && (
                <button className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => {
                  const motivo = window.prompt("Motivo de anulación de compra");
                  if (motivo) setMasterAction({ type: "cancel-purchase", compraId: compra.id, motivo });
                }}>
                  Anular
                </button>
              )}
            </div>
          ),
          expandedContent: expandedCompraId === compra.id ? (
            compraDetalle.isLoading ? (
              <p className="text-sm text-gray-500">Cargando detalle...</p>
            ) : compraDetalle.data ? (
              <div className="space-y-2">
                {compraDetalle.data.detalles.map((detalle) => (
                  <div key={detalle.id} className="grid gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto_auto]">
                    <div>
                      <p className="font-semibold text-gray-900">{detalle.producto_nombre}</p>
                      <p className="text-xs text-gray-500">Producto #{detalle.producto_id}</p>
                    </div>
                    <span className="text-gray-600">Cantidad {detalle.cantidad}</span>
                    <span className="text-gray-600">Costo {money(detalle.costo_unitario)}</span>
                    <span className="font-semibold text-gray-900">{money(detalle.subtotal_costo)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-600">No se pudo cargar el detalle.</p>
            )
          ) : undefined,
        }))}
      />
        </div>
      </div>

      {masterAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Autorización requerida</h2>
            <p className="mt-2 text-sm text-gray-600">
              Ingresa la contraseña maestra de un administrador para continuar.
            </p>
            <FormField label="Contraseña admin" className="mt-5">
              <input
                autoFocus
                type="password"
                value={masterPassword}
                onChange={(event) => setMasterPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") confirmMasterAction();
                  if (event.key === "Escape") closeMasterModal();
                }}
                className={inputClassName}
              />
            </FormField>
            <FormActions className="mt-1">
              <Button variant="ghost" onClick={closeMasterModal}>
                Cancelar
              </Button>
              <Button
                onClick={confirmMasterAction}
                disabled={!masterPassword || anulacion.isPending}
              >
                Autorizar
              </Button>
            </FormActions>
          </div>
        </div>
      )}
    </div>
  );
}
