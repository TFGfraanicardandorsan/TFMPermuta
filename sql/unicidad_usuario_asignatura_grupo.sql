-- OPCIONAL. El backend ya serializa estas altas con pg_advisory_xact_lock y no depende de estos índices.
-- Añadirlos da una garantía adicional a nivel de base de datos frente a inserciones desde otros procesos.
--
-- ANTES DE EJECUTAR: comprobar y limpiar duplicados existentes, o la creación del índice fallará.
--   SELECT usuario_id_fk, asignatura_id_fk, COUNT(*) FROM usuario_asignatura
--     GROUP BY 1, 2 HAVING COUNT(*) > 1;
--   SELECT usuario_id_fk, grupo_id_fk, COUNT(*) FROM usuario_grupo
--     GROUP BY 1, 2 HAVING COUNT(*) > 1;
-- Para eliminar duplicados conservando una fila (revisar antes en un entorno de pruebas):
--   DELETE FROM usuario_asignatura a USING usuario_asignatura b
--     WHERE a.ctid > b.ctid AND a.usuario_id_fk = b.usuario_id_fk AND a.asignatura_id_fk = b.asignatura_id_fk;
--   DELETE FROM usuario_grupo a USING usuario_grupo b
--     WHERE a.ctid > b.ctid AND a.usuario_id_fk = b.usuario_id_fk AND a.grupo_id_fk = b.grupo_id_fk;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS usuario_asignatura_unico
  ON usuario_asignatura (usuario_id_fk, asignatura_id_fk);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS usuario_grupo_unico
  ON usuario_grupo (usuario_id_fk, grupo_id_fk);
