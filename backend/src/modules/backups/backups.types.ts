export interface BackupFileInfo {
  readonly filename: string;
  readonly size_bytes: number;
  readonly created_at: string;
}

export interface BackupParams {
  readonly filename: string;
}

