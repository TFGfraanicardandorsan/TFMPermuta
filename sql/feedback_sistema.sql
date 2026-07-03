BEGIN;

CREATE TABLE IF NOT EXISTS feedback_sistema (
  id_feedback BIGSERIAL PRIMARY KEY,
  usuario_id_fk INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  rol VARCHAR(30) NOT NULL,
  satisfaccion_general SMALLINT NOT NULL
    CHECK (satisfaccion_general BETWEEN 1 AND 5),
  facilidad_uso SMALLINT NOT NULL
    CHECK (facilidad_uso BETWEEN 1 AND 5),
  recomendacion SMALLINT NOT NULL
    CHECK (recomendacion BETWEEN 0 AND 10),
  tipo_aporte VARCHAR(30)
    CHECK (
      tipo_aporte IS NULL
      OR tipo_aporte IN ('mejora', 'problema', 'nueva_funcionalidad', 'otro')
    ),
  comentario VARCHAR(1500),
  solicita_seguimiento BOOLEAN NOT NULL DEFAULT TRUE,
  estado VARCHAR(20) NOT NULL DEFAULT 'recibida'
    CHECK (
      estado IN ('recibida', 'en_revision', 'planificada', 'implementada', 'descartada')
    ),
  respuesta_administracion VARCHAR(1500),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por_usuario_id_fk INTEGER REFERENCES usuario(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_sistema_usuario_fecha
  ON feedback_sistema (usuario_id_fk, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_sistema_estado_fecha
  ON feedback_sistema (estado, fecha_creacion DESC);

CREATE TABLE IF NOT EXISTS historial_feedback_sistema (
  id BIGSERIAL PRIMARY KEY,
  feedback_id_fk BIGINT NOT NULL
    REFERENCES feedback_sistema(id_feedback) ON DELETE CASCADE,
  estado_anterior VARCHAR(20) NOT NULL,
  estado_nuevo VARCHAR(20) NOT NULL,
  respuesta_administracion VARCHAR(1500),
  administrador_usuario_id_fk INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_feedback_sistema_feedback
  ON historial_feedback_sistema (feedback_id_fk, fecha_cambio DESC);

COMMIT;
