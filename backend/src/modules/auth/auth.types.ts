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

export interface SetupAdminBody {
  readonly nombre_usuario: string;
  readonly nombre: string;
  readonly email?: string | null;
  readonly contraseña: string;
  readonly confirmar_contraseña: string;
  readonly nombre_dispositivo?: string;
}

export interface SetupStatusResult {
  readonly requiere_setup: boolean;
}

export interface SetupAdminResult extends LoginResult, DeviceAuthResult {}

export interface AuthorizeDeviceBody {
  readonly nombre_usuario: string;
  readonly contraseña: string;
  readonly nombre_dispositivo?: string;
}

export interface ProfileLoginBody {
  readonly usuario_id: number;
  readonly contraseña: string;
}

export interface RecoverProfilePasswordBody {
  readonly usuario_id: number;
  readonly master_password: string;
  readonly contraseña: string;
  readonly confirmar_contraseña: string;
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

export interface DeviceAuthResult {
  readonly device_token: string;
  readonly dispositivo: {
    readonly id: string;
    readonly nombre: string;
  };
}

export interface DeviceProfile extends AuthUser {
  readonly activo: boolean;
}

export interface PosProfileLoginResult extends LoginResult {
  readonly requiere_apertura_turno: boolean;
  readonly turno_abierto: {
    readonly id: number;
    readonly usuario_id: number;
    readonly usuario_nombre: string;
  } | null;
}

export interface DeviceRow {
  readonly id: string;
  readonly nombre: string;
  readonly token_hash: string;
  readonly autorizado_por: number | null;
  readonly activo: boolean;
}
