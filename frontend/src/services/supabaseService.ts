import type { Producto } from "../types/api";

export type EstadoCompraMovil = "PENDIENTE" | "PROCESANDO" | "APROBADA" | "ERROR";

export interface ResultadoSincronizacionProductos {
  insertados: number;
  actualizados: number;
  sin_cambios: number;
  omitidos: number;
}

export interface CompraMovilItem {
  id: number;
  producto_id: number;
  cantidad: number;
  costo_unitario: number;
  actualizar_precio_venta: boolean;
  precio_final: number | null;
  producto: {
    codigo_barras: string;
    nombre: string;
  } | null;
}

export interface CompraMovil {
  id: string;
  estado: EstadoCompraMovil;
  dispositivo: string | null;
  nota: string | null;
  error_mensaje: string | null;
  compra_local_id: number | null;
  creada_en: string;
  actualizada_en: string;
  items: CompraMovilItem[];
}

const getConfig = () => {
  const url = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_UR)
    ?.trim()
    .replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key) {
    throw new Error("Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY para usar Supabase.");
  }

  return { url, key };
};

const requestSupabase = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const payload = await response.json().catch(() => null) as { message?: string; details?: string } | T | null;

  if (!response.ok) {
    const errorPayload = payload as { message?: string; details?: string } | null;
    throw new Error(errorPayload?.message || errorPayload?.details || `Supabase respondió ${response.status}`);
  }

  return payload as T;
};

export async function sincronizarProductos(productos: Producto[]): Promise<ResultadoSincronizacionProductos> {
  return requestSupabase<ResultadoSincronizacionProductos>("rpc/sincronizar_productos_catalogo", {
    method: "POST",
    body: JSON.stringify({
      productos: productos.map((producto) => ({
        codigo_barras: producto.codigo_barras,
        nombre: producto.nombre,
        tipo_propiedad: producto.tipo_propiedad,
        proveedor: producto.proveedor_nombre,
        modo_inventario: producto.modo_inventario,
        activo: producto.activo,
        costo: producto.costo_actual,
        precio_venta: producto.precio_venta,
      })),
    }),
  });
}

export async function getComprasMoviles(): Promise<CompraMovil[]> {
  const select = [
    "id",
    "estado",
    "dispositivo",
    "nota",
    "error_mensaje",
    "compra_local_id",
    "creada_en",
    "actualizada_en",
    "items:compra_celular_items(id,producto_id,cantidad,costo_unitario,actualizar_precio_venta,precio_final,producto:productos(codigo_barras,nombre))",
  ].join(",");

  return requestSupabase<CompraMovil[]>(
    `compras_celular?select=${encodeURIComponent(select)}&order=creada_en.desc&limit=100`,
  );
}

export async function tomarCompraMovil(compraId: string): Promise<boolean> {
  return requestSupabase<boolean>("rpc/tomar_compra_celular", {
    method: "POST",
    body: JSON.stringify({ p_compra_id: compraId }),
  });
}

export async function finalizarCompraMovil(input: {
  compraId: string;
  estado: "APROBADA" | "ERROR";
  compraLocalId?: number;
  errorMensaje?: string;
}): Promise<void> {
  await requestSupabase<unknown>("rpc/finalizar_compra_celular", {
    method: "POST",
    body: JSON.stringify({
      p_compra_id: input.compraId,
      p_estado: input.estado,
      p_compra_local_id: input.compraLocalId ?? null,
      p_error_mensaje: input.errorMensaje ?? null,
    }),
  });
}
