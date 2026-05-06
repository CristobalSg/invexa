import type { UserRole } from '../../plugins/jwt.plugin.js';

export interface UsuarioAuthRow {
  readonly id: number;
  readonly nombre_usuario: string;
  readonly contrasena_hash: string;
  readonly nombre: string;
  readonly email: string | null;
  readonly rol: UserRole;
  readonly activo: boolean;
}

export interface LoginBody {
  readonly nombre_usuario: string;
  readonly contraseña: string;
}

export interface AuthUser {
  readonly id: number;
  readonly nombre_usuario: string;
  readonly nombre: string;
  readonly email: string | null;
  readonly rol: UserRole;
}

export interface LoginResult {
  readonly token: string;
  readonly usuario: AuthUser;
}
