import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategoria,
  createOferta,
  createProveedor,
  deactivateOferta,
  getCategorias,
  getOfertas,
  getProveedores,
} from "../services/catalogService";
import { getProducts } from "../services/productService";

export default function CatalogosPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [categoria, setCategoria] = useState({ nombre: "", multiplicador_ganancia: 1.3, variacion_maxima_precio: 0.2 });
  const [proveedor, setProveedor] = useState({ nombre: "", telefono: "", porcentaje_comision: 0 });
  const [oferta, setOferta] = useState({ producto_id: 0, nombre: "", precio_oferta: 0, motivo: "" });

  const categorias = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });
  const proveedores = useQuery({ queryKey: ["proveedores"], queryFn: () => getProveedores() });
  const ofertas = useQuery({ queryKey: ["ofertas"], queryFn: () => getOfertas() });
  const productos = useQuery({ queryKey: ["products"], queryFn: () => getProducts({ activo: true }) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categorias"] });
    queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    queryClient.invalidateQueries({ queryKey: ["ofertas"] });
  };

  const createCat = useMutation({
    mutationFn: () => createCategoria(categoria),
    onSuccess: () => { invalidate(); setCategoria({ nombre: "", multiplicador_ganancia: 1.3, variacion_maxima_precio: 0.2 }); setMessage("Categoría creada."); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Error"),
  });
  const createProv = useMutation({
    mutationFn: () => createProveedor({ ...proveedor, telefono: proveedor.telefono || null }),
    onSuccess: () => { invalidate(); setProveedor({ nombre: "", telefono: "", porcentaje_comision: 0 }); setMessage("Proveedor creado."); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Error"),
  });
  const createOff = useMutation({
    mutationFn: () => createOferta({ ...oferta, motivo: oferta.motivo || null, activa: true }),
    onSuccess: () => { invalidate(); setOferta({ producto_id: 0, nombre: "", precio_oferta: 0, motivo: "" }); setMessage("Oferta creada."); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Error"),
  });
  const disableOff = useMutation({
    mutationFn: deactivateOferta,
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Catálogos</h1>
      {message && <p className="bg-white rounded border p-3 text-sm">{message}</p>}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Nueva categoría</h2>
          <input className="border rounded px-3 py-2 w-full" placeholder="Nombre" value={categoria.nombre} onChange={(e) => setCategoria({ ...categoria, nombre: e.target.value })} />
          <input className="border rounded px-3 py-2 w-full" type="number" step="0.01" value={categoria.multiplicador_ganancia} onChange={(e) => setCategoria({ ...categoria, multiplicador_ganancia: Number(e.target.value) })} />
          <input className="border rounded px-3 py-2 w-full" type="number" step="0.01" value={categoria.variacion_maxima_precio} onChange={(e) => setCategoria({ ...categoria, variacion_maxima_precio: Number(e.target.value) })} />
          <button onClick={() => createCat.mutate()} className="bg-blue-600 text-white rounded px-4 py-2">Crear</button>
        </div>
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Nuevo proveedor</h2>
          <input className="border rounded px-3 py-2 w-full" placeholder="Nombre" value={proveedor.nombre} onChange={(e) => setProveedor({ ...proveedor, nombre: e.target.value })} />
          <input className="border rounded px-3 py-2 w-full" placeholder="Teléfono" value={proveedor.telefono} onChange={(e) => setProveedor({ ...proveedor, telefono: e.target.value })} />
          <input className="border rounded px-3 py-2 w-full" type="number" placeholder="Comisión %" value={proveedor.porcentaje_comision} onChange={(e) => setProveedor({ ...proveedor, porcentaje_comision: Number(e.target.value) })} />
          <button onClick={() => createProv.mutate()} className="bg-blue-600 text-white rounded px-4 py-2">Crear</button>
        </div>
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Nueva oferta</h2>
          <select className="border rounded px-3 py-2 w-full" value={oferta.producto_id} onChange={(e) => setOferta({ ...oferta, producto_id: Number(e.target.value) })}>
            <option value={0}>Producto</option>
            {productos.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input className="border rounded px-3 py-2 w-full" placeholder="Nombre" value={oferta.nombre} onChange={(e) => setOferta({ ...oferta, nombre: e.target.value })} />
          <input className="border rounded px-3 py-2 w-full" type="number" placeholder="Precio oferta" value={oferta.precio_oferta} onChange={(e) => setOferta({ ...oferta, precio_oferta: Number(e.target.value) })} />
          <input className="border rounded px-3 py-2 w-full" placeholder="Motivo" value={oferta.motivo} onChange={(e) => setOferta({ ...oferta, motivo: e.target.value })} />
          <button disabled={!oferta.producto_id} onClick={() => createOff.mutate()} className="bg-blue-600 disabled:bg-gray-300 text-white rounded px-4 py-2">Crear</button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <List title="Categorías" rows={categorias.data?.items.map((c) => [`#${c.id}`, c.nombre, `x${c.multiplicador_ganancia}`]) ?? []} />
        <List title="Proveedores" rows={proveedores.data?.items.map((p) => [`#${p.id}`, p.nombre, `${p.porcentaje_comision}%`, p.activo ? "Activo" : "Inactivo"]) ?? []} />
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Ofertas</h2>
          <div className="space-y-2 text-sm">
            {ofertas.data?.items.map((o) => (
              <div key={o.id} className="border rounded p-2 flex justify-between gap-2">
                <span>{o.nombre} · {o.producto_nombre} · ${o.precio_oferta.toLocaleString()}</span>
                {o.activa && <button className="text-red-600" onClick={() => disableOff.mutate(o.id)}>Desactivar</button>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function List({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="space-y-2 text-sm">{rows.map((row) => <div key={row.join("-")} className="border rounded p-2">{row.join(" · ")}</div>)}</div>
    </div>
  );
}
