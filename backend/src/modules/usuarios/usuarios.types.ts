import type { UserRole } from '../../plugins/jwt.plugin.js';

export interface UsuarioRow {
  readonly id: number;
  readonly nombre_usuario: string;
  readonly nombre: string;
  readonly email: string | null;
  readonly rol: UserRole;
  readonly activo: boolean;
  readonly creado_en: Date;
}

export interface UsuarioDuplicateRow {
  readonly id: number;
  readonly nombre_usuario: string;
  readonly email: string | null;
}

export interface Usuario {
  readonly id: number;
  readonly nombre_usuario: string;
  readonly nombre: string;
  readonly email: string | null;
  readonly rol: UserRole;
  readonly activo: boolean;
  readonly creado_en: string;
}

export interface UsuarioParams {
  readonly id: number;
}

export interface CreateUsuarioBody {
  readonly nombre_usuario: string;
  readonly contraseña: string;
  readonly nombre: string;
  readonly email?: string | null;
  readonly rol: UserRole;
}

export interface UpdateUsuarioBody {
  readonly nombre_usuario?: string;
  readonly contraseña?: string;
  readonly master_password?: string;
  readonly nombre?: string;
  readonly email?: string | null;
  readonly rol?: UserRole;
  readonly activo?: boolean;
}
