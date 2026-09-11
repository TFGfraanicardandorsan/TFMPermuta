BEGIN;

-- NULL conserva las solicitudes y permutas individuales existentes.
ALTER TABLE solicitud_permuta ADD COLUMN IF NOT EXISTS bloque_id uuid;
ALTER TABLE permuta ADD COLUMN IF NOT EXISTS bloque_id uuid;
CREATE INDEX IF NOT EXISTS solicitud_permuta_bloque_idx
  ON solicitud_permuta (bloque_id) WHERE bloque_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS permuta_bloque_idx
  ON permuta (bloque_id) WHERE bloque_id IS NOT NULL;

COMMIT;
