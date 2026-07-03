import database from "../config/database.mjs";

export class FeedbackNotFoundError extends Error {
  constructor() {
    super("No se ha encontrado la aportación indicada");
    this.name = "FeedbackNotFoundError";
  }
}

const FEEDBACK_FIELDS = `
  f.id_feedback,
  f.satisfaccion_general,
  f.facilidad_uso,
  f.recomendacion,
  f.tipo_aporte,
  f.comentario,
  f.solicita_seguimiento,
  f.estado,
  f.respuesta_administracion,
  f.fecha_creacion,
  f.fecha_actualizacion
`;

class FeedbackService {
  async crearFeedback(uvus, rol, feedback) {
    const conexion = await database.connectPostgreSQL();
    try {
      const resultado = await conexion.query({
        text: `
          INSERT INTO feedback_sistema (
            usuario_id_fk,
            rol,
            satisfaccion_general,
            facilidad_uso,
            recomendacion,
            tipo_aporte,
            comentario,
            solicita_seguimiento
          )
          SELECT
            u.id,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          FROM usuario u
          WHERE u.nombre_usuario = $1
          RETURNING
            id_feedback,
            satisfaccion_general,
            facilidad_uso,
            recomendacion,
            tipo_aporte,
            comentario,
            solicita_seguimiento,
            estado,
            respuesta_administracion,
            fecha_creacion,
            fecha_actualizacion
        `,
        values: [
          uvus,
          rol,
          feedback.satisfaccion_general,
          feedback.facilidad_uso,
          feedback.recomendacion,
          feedback.tipo_aporte,
          feedback.comentario,
          feedback.solicita_seguimiento,
        ],
      });

      if (resultado.rows.length === 0) {
        throw new Error("El usuario autenticado no existe en la base de datos");
      }
      return resultado.rows[0];
    } finally {
      await conexion.end();
    }
  }

  async obtenerFeedbackUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const resultado = await conexion.query({
        text: `
          SELECT ${FEEDBACK_FIELDS}
          FROM feedback_sistema f
          INNER JOIN usuario u ON u.id = f.usuario_id_fk
          WHERE u.nombre_usuario = $1
          ORDER BY f.fecha_creacion DESC, f.id_feedback DESC
        `,
        values: [uvus],
      });
      return resultado.rows;
    } finally {
      await conexion.end();
    }
  }

  async obtenerTodosFeedback() {
    const conexion = await database.connectPostgreSQL();
    try {
      const resultado = await conexion.query({
        text: `
          SELECT
            ${FEEDBACK_FIELDS},
            u.nombre_usuario AS uvus,
            f.rol
          FROM feedback_sistema f
          INNER JOIN usuario u ON u.id = f.usuario_id_fk
          ORDER BY f.fecha_creacion DESC, f.id_feedback DESC
        `,
      });
      return resultado.rows;
    } finally {
      await conexion.end();
    }
  }

  async actualizarEstado(idFeedback, estado, respuestaAdministracion, administradorUvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query("BEGIN");

      const actual = await conexion.query({
        text: `
          SELECT estado
          FROM feedback_sistema
          WHERE id_feedback = $1
          FOR UPDATE
        `,
        values: [idFeedback],
      });

      if (actual.rows.length === 0) {
        throw new FeedbackNotFoundError();
      }

      const actualizado = await conexion.query({
        text: `
          UPDATE feedback_sistema
          SET
            estado = $2,
            respuesta_administracion = $3,
            fecha_actualizacion = NOW(),
            actualizado_por_usuario_id_fk = (
              SELECT id
              FROM usuario
              WHERE nombre_usuario = $4
            )
          WHERE id_feedback = $1
          RETURNING
            id_feedback,
            satisfaccion_general,
            facilidad_uso,
            recomendacion,
            tipo_aporte,
            comentario,
            solicita_seguimiento,
            estado,
            respuesta_administracion,
            fecha_creacion,
            fecha_actualizacion
        `,
        values: [idFeedback, estado, respuestaAdministracion, administradorUvus],
      });

      await conexion.query({
        text: `
          INSERT INTO historial_feedback_sistema (
            feedback_id_fk,
            estado_anterior,
            estado_nuevo,
            respuesta_administracion,
            administrador_usuario_id_fk
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            (SELECT id FROM usuario WHERE nombre_usuario = $5)
          )
        `,
        values: [
          idFeedback,
          actual.rows[0].estado,
          estado,
          respuestaAdministracion,
          administradorUvus,
        ],
      });

      await conexion.query("COMMIT");
      return actualizado.rows[0];
    } catch (error) {
      await conexion.query("ROLLBACK");
      throw error;
    } finally {
      await conexion.end();
    }
  }
}

const feedbackService = new FeedbackService();
export default feedbackService;
