BEGIN;

-- Evita nuevas escrituras entre la limpieza y la creación del índice.
LOCK TABLE grupo_deseado IN SHARE ROW EXCLUSIVE MODE;

-- Conserva una sola fila por pareja para instalaciones con datos históricos duplicados.
DELETE FROM grupo_deseado fila
USING grupo_deseado duplicada
WHERE fila.ctid < duplicada.ctid
  AND fila.solicitud_permuta_id_fk = duplicada.solicitud_permuta_id_fk
  AND fila.grupo_id_fk = duplicada.grupo_id_fk;

CREATE UNIQUE INDEX IF NOT EXISTS uq_grupo_deseado_solicitud_grupo
  ON grupo_deseado (solicitud_permuta_id_fk, grupo_id_fk);

COMMIT;
