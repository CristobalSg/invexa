CREATE TABLE IF NOT EXISTS dispositivos_pos (
  id UUID PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  autorizado_por INT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  autorizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  ultimo_uso_en TIMESTAMP,

  CONSTRAINT fk_dispositivo_autorizado_por
    FOREIGN KEY (autorizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

ALTER TABLE sesiones_caja
  ADD COLUMN IF NOT EXISTS dispositivo_id UUID;

ALTER TABLE sesiones_caja
  ADD CONSTRAINT fk_sesion_caja_dispositivo
  FOREIGN KEY (dispositivo_id) REFERENCES dispositivos_pos(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sesiones_caja_dispositivo
  ON sesiones_caja(dispositivo_id, abierta);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sesion_caja_dispositivo_abierta
  ON sesiones_caja(dispositivo_id)
  WHERE abierta = TRUE
    AND cerrada_en IS NULL
    AND dispositivo_id IS NOT NULL;
