import api from "../lib/axios";
import type { Categoria, Oferta, PaginatedResult, Proveedor, Usuario, UserRole } from "../types/api";

export async function getCategorias(params: { page?: number; limit?: number; search?: string } = {}) {
  const { data } = await api.get<PaginatedResult<Categoria>>("/categorias", { params: { page: 1, limit: 100, ...params } });
  return data;
}

export async function createCategoria(input: Partial<Categoria>) {
  const { data } = await api.post<Categoria>("/categorias", input);
  return data;
}

export async function updateCategoria(id: number, input: Partial<Categoria>) {
  const { data } = await api.patch<Categoria>(`/categorias/${id}`, input);
  return data;
}

export async function getProveedores(params: { page?: number; limit?: number; search?: string; activo?: boolean } = {}) {
  const { data } = await api.get<PaginatedResult<Proveedor>>("/proveedores", { params: { page: 1, limit: 100, ...params } });
  return data;
}

export async function createProveedor(input: { nombre: string; telefono?: string | null; porcentaje_comision?: number; activo?: boolean }) {
  const { data } = await api.post<Proveedor>("/proveedores", input);
  return data;
}

export async function updateProveedor(id: number, input: Partial<Proveedor>) {
  const { data } = await api.patch<Proveedor>(`/proveedores/${id}`, input);
  return data;
}

export async function getUsuarios() {
  const { data } = await api.get<Usuario[]>("/usuarios");
  return data;
}

export async function createUsuario(input: {
  nombre_usuario: string;
  contraseña: string;
  nombre: string;
  email?: string | null;
  rol: UserRole;
}) {
  const { data } = await api.post<Usuario>("/usuarios", input);
  return data;
}

export async function updateUsuario(id: number, input: Partial<Usuario> & { contraseña?: string }) {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}`, input);
  return data;
}

export async function deactivateUsuario(id: number) {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}/desactivar`);
  return data;
}

export async function getOfertas(params: { page?: number; limit?: number; search?: string; activa?: boolean; producto_id?: number } = {}) {
  const { data } = await api.get<PaginatedResult<Oferta>>("/ofertas", { params: { page: 1, limit: 100, ...params } });
  return data;
}

export async function createOferta(input: {
  producto_id: number;
  nombre: string;
  precio_oferta: number;
  activa?: boolean;
  inicia_en?: string;
  termina_en?: string | null;
  motivo?: string | null;
}) {
  const { data } = await api.post<Oferta>("/ofertas", input);
  return data;
}

export async function updateOferta(id: number, input: Partial<Oferta>) {
  const { data } = await api.patch<Oferta>(`/ofertas/${id}`, input);
  return data;
}

export async function deactivateOferta(id: number) {
  const { data } = await api.patch<Oferta>(`/ofertas/${id}/desactivar`);
  return data;
}
