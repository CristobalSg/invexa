import api from "../lib/axios";
import type {
  AuthUser,
  DeviceAuthResult,
  DeviceProfile,
  LoginResult,
  ProfileLoginResult,
  SetupAdminResult,
  SetupStatusResult,
} from "../types/api";

const TOKEN_KEY = "token";
const USER_KEY = "usuario";
const DEVICE_TOKEN_KEY = "device_token";
const DEVICE_KEY = "dispositivo_pos";

export async function login(nombre_usuario: string, contraseña: string): Promise<LoginResult> {
  const { data } = await api.post<LoginResult>("/auth/login", { nombre_usuario, contraseña });
  setUserSession(data);
  return data;
}

export async function authorizeDevice(input: {
  nombre_usuario: string;
  contraseña: string;
  nombre_dispositivo?: string;
}): Promise<DeviceAuthResult> {
  const { data } = await api.post<DeviceAuthResult>("/auth/dispositivo/autorizar", input);
  localStorage.setItem(DEVICE_TOKEN_KEY, data.device_token);
  localStorage.setItem(DEVICE_KEY, JSON.stringify(data.dispositivo));
  return data;
}

export async function getSetupStatus(): Promise<SetupStatusResult> {
  const { data } = await api.get<SetupStatusResult>("/auth/setup/estado");
  return data;
}

export async function setupInitialAdmin(input: {
  nombre_usuario: string;
  nombre: string;
  email?: string | null;
  contraseña: string;
  confirmar_contraseña: string;
  nombre_dispositivo?: string;
}): Promise<SetupAdminResult> {
  const { data } = await api.post<SetupAdminResult>("/auth/setup/admin", input);
  setUserSession(data);
  localStorage.setItem(DEVICE_TOKEN_KEY, data.device_token);
  localStorage.setItem(DEVICE_KEY, JSON.stringify(data.dispositivo));
  return data;
}

export async function getProfiles(): Promise<DeviceProfile[]> {
  const { data } = await api.get<DeviceProfile[]>("/auth/perfiles");
  return data;
}

export async function loginProfile(usuario_id: number, contraseña: string): Promise<ProfileLoginResult> {
  const { data } = await api.post<ProfileLoginResult>("/auth/perfiles/login", { usuario_id, contraseña });
  setUserSession(data);
  return data;
}

export async function recoverProfilePassword(input: {
  usuario_id: number;
  master_password: string;
  contraseña: string;
  confirmar_contraseña: string;
}): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>("/auth/perfiles/recuperar-contrasena", input);
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  localStorage.setItem(USER_KEY, JSON.stringify(data));
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

export function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function getStoredDevice(): { id: string; nombre: string } | null {
  const raw = localStorage.getItem(DEVICE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; nombre: string };
  } catch {
    return null;
  }
}

export function clearDeviceAuthorization() {
  localStorage.removeItem(DEVICE_TOKEN_KEY);
  localStorage.removeItem(DEVICE_KEY);
  logout();
}

export function setUserSession(data: LoginResult) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
