BEGIN;

CREATE TABLE IF NOT EXISTS pregunta_valoracion_asignatura (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  bloque INTEGER NOT NULL,
  bloque_nombre VARCHAR(120) NOT NULL,
  enunciado TEXT NOT NULL,
  tipo_respuesta VARCHAR(20) NOT NULL CHECK (tipo_respuesta IN ('si_no', 'texto', 'escala_1_10')),
  condicion VARCHAR(120),
  orden INTEGER NOT NULL,
  CONSTRAINT pregunta_valoracion_asignatura_orden_unico_por_bloque UNIQUE (bloque, orden),
  CONSTRAINT unique_bloque_orden UNIQUE (bloque, orden),
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS respuesta_valoracion_asignatura (
  id BIGSERIAL PRIMARY KEY,
  usuario_id_fk INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  asignatura_id_fk INTEGER NOT NULL REFERENCES asignatura(id) ON DELETE CASCADE,
  pregunta_id_fk INTEGER NOT NULL REFERENCES pregunta_valoracion_asignatura(id) ON DELETE CASCADE,
  respuesta_boolean BOOLEAN,
  respuesta_numero NUMERIC(5, 2),
  respuesta_texto TEXT,
  fecha_respuesta TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT respuesta_valoracion_asignatura_unica UNIQUE (usuario_id_fk, asignatura_id_fk, pregunta_id_fk),
  CONSTRAINT respuesta_valoracion_asignatura_contenido_chk CHECK (
    num_nonnulls(respuesta_boolean, respuesta_numero, respuesta_texto) = 1
  ),
  CONSTRAINT respuesta_valoracion_asignatura_numero_chk CHECK (
    respuesta_numero IS NULL OR (respuesta_numero >= 1 AND respuesta_numero <= 10)
  )
);

CREATE INDEX IF NOT EXISTS idx_respuesta_valoracion_asignatura_asignatura
  ON respuesta_valoracion_asignatura (asignatura_id_fk);

CREATE INDEX IF NOT EXISTS idx_respuesta_valoracion_asignatura_pregunta
  ON respuesta_valoracion_asignatura (pregunta_id_fk);

CREATE INDEX IF NOT EXISTS idx_respuesta_valoracion_asignatura_fecha
  ON respuesta_valoracion_asignatura (fecha_respuesta);

INSERT INTO pregunta_valoracion_asignatura
  (codigo, bloque, bloque_nombre, enunciado, tipo_respuesta, condicion, orden)
VALUES
  ('contenidos_relevantes', 1, 'Contenidos', '¿Los contenidos de la asignatura te parecen relevantes para tu formación como profesional?', 'si_no', NULL, 1),
  ('temario_actualizado', 1, 'Contenidos', '¿Sientes que el temario está actualizado respecto a lo que se usa hoy en la industria?', 'si_no', NULL, 2),
  ('carga_proporcional_ects', 1, 'Contenidos', '¿La carga de trabajo de esta asignatura te ha parecido proporcional a sus créditos ECTS?', 'si_no', NULL, 3),
  ('contenido_repetido', 1, 'Contenidos', '¿Has notado que algún contenido de esta asignatura se repite innecesariamente con otra asignatura del grado?', 'si_no', NULL, 4),
  ('herramientas_profesionales', 2, 'Herramientas y recursos', '¿Las herramientas utilizadas en la asignatura son las que se usan actualmente en el mundo profesional?', 'si_no', 'estudiantes_que_trabajan', 5),
  ('claridad_uso_herramientas', 2, 'Herramientas y recursos', '¿Se te explicó con claridad por qué se usaba cada herramienta?', 'si_no', NULL, 6),
  ('problemas_acceso_herramientas', 2, 'Herramientas y recursos', '¿Has tenido problemas para acceder a alguna herramienta requerida (coste, compatibilidad, licencias)?', 'si_no', NULL, 7),
  ('herramienta_obsoleta_cual', 2, 'Herramientas y recursos', '¿Hay alguna herramienta concreta que consideres obsoleta o inadecuada? ¿Cuál?', 'texto', NULL, 8),
  ('materiales_actualizados_utiles', 2, 'Herramientas y recursos', '¿Los materiales de estudio (apuntes, libros, recursos online) estaban actualizados y eran útiles?', 'si_no', NULL, 9),
  ('evaluacion_justa_coherente', 3, 'Metodología y evaluación', '¿El sistema de evaluación te ha parecido justo y coherente con lo trabajado en clase?', 'si_no', NULL, 10),
  ('criterios_evaluacion_claros', 3, 'Metodología y evaluación', '¿Los criterios de evaluación estaban claros desde el inicio del cuatrimestre?', 'si_no', NULL, 11),
  ('metodologia_profundidad', 3, 'Metodología y evaluación', '¿La forma de impartir la asignatura ha favorecido que entiendas los conceptos en profundidad?', 'si_no', NULL, 12),
  ('habilidades_fuera_aula', 3, 'Metodología y evaluación', '¿Sientes que has desarrollado habilidades aplicables fuera del aula?', 'si_no', NULL, 13),
  ('encaje_plan_estudios', 4, 'Adecuación al grado', '¿Esta asignatura encaja bien dentro del plan de estudios de tu grado?', 'si_no', NULL, 14),
  ('nivel_adecuado_curso', 4, 'Adecuación al grado', '¿El nivel de la asignatura es adecuado para el curso en el que se imparte?', 'si_no', NULL, 15),
  ('profesorado_disponible', 4, 'Adecuación al grado', '¿Has sentido que el profesorado tenía suficiente disponibilidad para atender a todos los estudiantes?', 'si_no', NULL, 16),
  ('cambios_utilidad_asignatura', 5, 'Valoración y propuestas', '¿Qué cambiarías de esta asignatura para que fuera más útil o enriquecedora?', 'texto', NULL, 17),
  ('recursos_enfoques_faltantes', 5, 'Valoración y propuestas', '¿Hay algún recurso, herramienta o enfoque que echaras en falta y que crees que debería incluirse?', 'texto', NULL, 18),
  ('valoracion_global', 5, 'Valoración y propuestas', 'Valoración global de la asignatura, independientemente del docente (1-10).', 'escala_1_10', NULL, 19),
  ('herramientas_obsoletas_industria', 6, 'Herramientas y recursos', '¿Alguna de las herramientas utilizadas te ha parecido claramente obsoleta respecto a lo que ves en ofertas de empleo o en la industria?', 'si_no', NULL, 20),
  ('aprendizaje_herramienta_sin_apoyo', 6, 'Herramientas y recursos', '¿Has tenido que aprender a usar una herramienta por tu cuenta sin suficiente apoyo o documentación por parte de la asignatura?', 'si_no', NULL, 21),
  ('herramienta_resta_tiempo', 6, 'Herramientas y recursos', '¿El tiempo dedicado a aprender la herramienta en sí ha restado tiempo al aprendizaje real de los contenidos de la asignatura?', 'si_no', NULL, 22),
  ('pago_herramientas', 6, 'Herramientas y recursos', '¿Has tenido que pagar de tu bolsillo por alguna herramienta, licencia o recurso requerido en la asignatura?', 'si_no', NULL, 23),
  ('solapamientos_contenido', 7, 'Coordinación entre asignaturas', '¿Has experimentado solapamientos claros de contenido entre dos o más asignaturas del grado?', 'si_no', NULL, 24),
  ('falta_conocimientos_previos', 7, 'Coordinación entre asignaturas', '¿Has llegado a una asignatura sin los conocimientos previos que se daban por supuestos, porque no los habías visto en cursos anteriores?', 'si_no', NULL, 25),
  ('acumulacion_entregas_examenes', 7, 'Coordinación entre asignaturas', '¿Se han acumulado entregas o exámenes de varias asignaturas en las mismas fechas de forma recurrente?', 'si_no', NULL, 26),
  ('asignaturas_fusionables_eliminables', 7, 'Coordinación entre asignaturas', '¿Sientes que hay asignaturas del grado que podrían fusionarse o eliminarse sin perder formación útil para tu futuro?', 'si_no', NULL, 27),
  ('carga_real_proyecto_docente', 8, 'Carga de trabajo y planificación', '¿La carga de trabajo real de esta asignatura coincide con la que se describe en el proyecto docente (X horas)?', 'si_no', NULL, 28),
  ('semanas_acumulacion_entregas', 8, 'Carga de trabajo y planificación', '¿Has tenido semanas con una acumulación de entregas tan alta que te ha impedido trabajar con calidad en alguna de ellas?', 'si_no', NULL, 29),
  ('calendario_definido_inicio', 8, 'Carga de trabajo y planificación', '¿El calendario de entregas y exámenes de esta asignatura ha estado claramente definido desde el inicio del cuatrimestre?', 'si_no', NULL, 30),
  ('tiempo_no_presencial_excesivo', 8, 'Carga de trabajo y planificación', '¿Sientes que el tiempo no presencial que dedicas a la asignatura es excesivo respecto a sus créditos (X horas)?', 'si_no', NULL, 31),
  ('contenidos_aplicables_profesion', 9, 'Relación con la industria y empleabilidad', '¿Los contenidos de esta asignatura te parecen aplicables directamente en un entorno profesional real?', 'si_no', NULL, 32),
  ('casos_reales_industria', 9, 'Relación con la industria y empleabilidad', '¿Se han utilizado casos prácticos, proyectos o ejemplos basados en situaciones reales de la industria?', 'si_no', NULL, 33),
  ('falta_profesionales_externos', 9, 'Relación con la industria y empleabilidad', '¿Has echado en falta la participación de profesionales externos (charlas, talleres, casos reales) en esta asignatura?', 'si_no', NULL, 34),
  ('mejora_empleabilidad', 9, 'Relación con la industria y empleabilidad', '¿Crees que esta asignatura mejora tu empleabilidad o tu perfil profesional de forma tangible?', 'si_no', NULL, 35),
  ('metodologia_variada', 10, 'Innovación y metodología', '¿La forma de impartir la asignatura te ha parecido variada o ha sido monótona a lo largo del cuatrimestre?', 'si_no', NULL, 36),
  ('dinamicas_participativas', 10, 'Innovación y metodología', '¿Se han usado dinámicas participativas (debates, casos prácticos, trabajo en grupo real) o ha sido principalmente clase magistral?', 'si_no', NULL, 37),
  ('docente_interes_mejora', 10, 'Innovación y metodología', '¿Sientes que el docente muestra interés por mejorar la asignatura o da la sensación de que se imparte igual año tras año?', 'si_no', NULL, 38),
  ('dudas_fuera_clase', 11, 'Atención y accesibilidad', '¿Has podido resolver tus dudas fuera del horario de clase sin dificultad?', 'si_no', NULL, 39),
  ('tutorias_accesibles_utiles', 11, 'Atención y accesibilidad', '¿Las tutorías han sido accesibles y útiles cuando las has necesitado?', 'si_no', NULL, 40),
  ('docente_tiempo_real', 11, 'Atención y accesibilidad', '¿Sientes que el docente tiene tiempo real para atenderte o está claramente desbordado?', 'si_no', NULL, 41),
  ('clase_coincide_proyecto', 12, 'Transparencia y guía docente', '¿Lo que se ha hecho en clase ha coincidido con lo que describía el proyecto docente?', 'si_no', NULL, 42),
  ('cambios_comunicados', 12, 'Transparencia y guía docente', '¿Los cambios respecto al proyecto docente se comunicaron con claridad y antelación?', 'si_no', NULL, 43),
  ('proyecto_docente_util', 12, 'Transparencia y guía docente', '¿El proyecto docente te ha resultado útil para planificar tu trabajo a lo largo del cuatrimestre?', 'si_no', NULL, 44)
ON CONFLICT (codigo) DO UPDATE SET
  bloque = EXCLUDED.bloque,
  bloque_nombre = EXCLUDED.bloque_nombre,
  enunciado = EXCLUDED.enunciado,
  tipo_respuesta = EXCLUDED.tipo_respuesta,
  condicion = EXCLUDED.condicion,
  orden = EXCLUDED.orden,
  activa = TRUE;

COMMIT;
