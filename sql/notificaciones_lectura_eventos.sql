BEGIN;

ALTER TABLE notificacion ADD COLUMN IF NOT EXISTS tipo varchar(30) NOT NULL DEFAULT 'ADMINISTRACION'
  CHECK (tipo IN ('ADMINISTRACION', 'PERMUTA', 'DOCUMENTO', 'INCIDENCIA'));
ALTER TABLE notificacion ADD COLUMN IF NOT EXISTS destinatario_id_fk integer REFERENCES usuario(id) ON DELETE CASCADE;
ALTER TABLE notificacion ADD COLUMN IF NOT EXISTS enlace text;
ALTER TABLE notificacion ADD COLUMN IF NOT EXISTS clave_evento text;
-- Los eventos automáticos no tienen un administrador como autor.
ALTER TABLE notificacion ALTER COLUMN usuario_id_fk DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notificacion_evento_destinatario_idx
  ON notificacion (clave_evento, destinatario_id_fk);
CREATE INDEX IF NOT EXISTS notificacion_destinatario_fecha_idx
  ON notificacion (destinatario_id_fk, fecha_creacion DESC);

CREATE TABLE IF NOT EXISTS notificacion_lectura (
  notificacion_id_fk integer NOT NULL REFERENCES notificacion(id) ON DELETE CASCADE,
  usuario_id_fk integer NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  leida boolean NOT NULL DEFAULT false,
  fecha_lectura timestamptz,
  PRIMARY KEY (notificacion_id_fk, usuario_id_fk)
);

COMMIT;
