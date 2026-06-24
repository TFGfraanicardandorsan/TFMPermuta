ALTER TABLE grupo
  ADD COLUMN IF NOT EXISTS habilitado BOOLEAN;

UPDATE grupo
SET habilitado = true
WHERE habilitado IS NULL;

ALTER TABLE grupo
  ALTER COLUMN habilitado SET DEFAULT true;

ALTER TABLE grupo
  ALTER COLUMN habilitado SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grupo_asignatura_habilitado
  ON grupo (asignatura_id_fk, habilitado);
