import api from "../lib/axios";
import type { AuthUser, LoginResult } from "../types/api";

export async function login(nombre_usuario: string, contraseña: string): Promise<LoginResult> {
  const { data } = await api.post<LoginResult>("/auth/login", { nombre_usuario, contraseña });
  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  localStorage.setItem("usuario", JSON.stringify(data));
  return data;
}

export async function authorizeAdmin(master_password: string): Promise<boolean> {
  const { data } = await api.post<{ authorized: boolean }>("/auth/autorizar-admin", { master_password });
  return data.authorized;
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("usuario");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}
