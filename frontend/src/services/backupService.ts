import api from "../lib/axios";
import type { BackupFileInfo } from "../types/api";

export async function getBackups(): Promise<BackupFileInfo[]> {
  const { data } = await api.get<BackupFileInfo[]>("/backups");
  return data;
}

export async function createBackup(): Promise<BackupFileInfo> {
  const { data } = await api.post<BackupFileInfo>("/backups");
  return data;
}

export async function deleteBackup(filename: string): Promise<BackupFileInfo> {
  const { data } = await api.delete<BackupFileInfo>(`/backups/${encodeURIComponent(filename)}`);
  return data;
}

export async function downloadBackup(filename: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`/backups/${encodeURIComponent(filename)}`, {
    responseType: "blob",
  });
  return data;
}

export async function restoreBackup(file: File): Promise<{ restored: boolean }> {
  const buffer = await file.arrayBuffer();
  const { data } = await api.post<{ restored: boolean }>("/backups/restaurar", buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Confirm-Restore": "REEMPLAZAR_BASE_ACTUAL",
    },
  });
  return data;
}

