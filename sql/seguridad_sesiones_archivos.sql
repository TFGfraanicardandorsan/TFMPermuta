BEGIN;

-- Ejecutar como propietario de las tablas antes de arrancar el backend parcheado.
CREATE TABLE IF NOT EXISTS web_session (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS web_session_expire_idx ON web_session (expire);

CREATE TABLE IF NOT EXISTS archivo_subido (
  tipo text NOT NULL CHECK (tipo IN ('buzon', 'archivador', 'proyectoDocente')),
  nombre text NOT NULL,
  propietario_id integer NOT NULL REFERENCES usuario(id),
  creado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tipo, nombre)
);
CREATE INDEX IF NOT EXISTS archivo_subido_propietario_idx ON archivo_subido (propietario_id);

-- Los adjuntos históricos se autorizan por su relación con incidencias/permutas.
-- No se infieren propietarios de archivos huérfanos ni se autoriza reutilizarlos.
COMMIT;
