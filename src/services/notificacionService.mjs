import database from "../config/database.mjs";
import autorizacionService from "./autorizacionService.mjs";
import { sendMessage } from "./telegramService.mjs";
import eventosNotificacion from './eventosNotificacionService.mjs';

// Una notificación personal nunca hereda la visibilidad del rol o de all.
const VISIBILIDAD = `(n.fecha_expiracion IS NULL OR n.fecha_expiracion >= NOW()) AND (
  n.destinatario_id_fk = u.id OR (n.destinatario_id_fk IS NULL AND (
    n.receptor = 'all' OR EXISTS (SELECT 1 FROM roles r WHERE r.usuario_id_fk = u.id
      AND (r.rol = n.receptor OR (r.rol IN ('delegacion', 'delgacion') AND n.receptor IN ('delegacion', 'delgacion'))))
  )))`;

class NotificacionService {
  async getNotificacionesUsuario(uvus, telegram = false) {
    const conexion = await database.connectPostgreSQL();
    try {
      const { rows } = await conexion.query({
        text: `SELECT n.id, n.contenido, n.fecha_creacion, n.tipo, n.enlace,
          COALESCE(l.leida, false) AS leida, l.fecha_lectura
          FROM notificacion n JOIN usuario u ON u.nombre_usuario = $1
          LEFT JOIN notificacion_lectura l ON l.notificacion_id_fk = n.id AND l.usuario_id_fk = u.id
          WHERE ${VISIBILIDAD}
          ORDER BY ${telegram ? 'n.fecha_creacion ASC, n.id ASC' : 'COALESCE(l.leida, false) ASC, n.fecha_creacion DESC, n.id DESC'}`,
        values: [uvus],
      });
      return rows;
    } finally { await conexion.end(); }
  }

  async getNotificacionesUsuarioTelegram(uvus) {
    return this.getNotificacionesUsuario(uvus, true);
  }

  async marcarLectura(uvus, id, leida) {
    if (typeof leida !== 'boolean' || (id !== null && (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647))) {
      throw Object.assign(new Error('Indica un ID positivo y leida como booleano.'), { statusCode: 400 });
    }
    const conexion = await database.connectPostgreSQL();
    try {
      const { rows } = await conexion.query({
        text: `INSERT INTO notificacion_lectura (notificacion_id_fk, usuario_id_fk, leida, fecha_lectura)
          SELECT n.id, u.id, $3, CASE WHEN $3 THEN NOW() ELSE NULL END
          FROM notificacion n JOIN usuario u ON u.nombre_usuario = $1
          WHERE (${VISIBILIDAD}) AND ($2::int IS NULL OR n.id = $2)
          ON CONFLICT (notificacion_id_fk, usuario_id_fk) DO UPDATE
          SET leida = EXCLUDED.leida,
            fecha_lectura = CASE WHEN EXCLUDED.leida THEN COALESCE(notificacion_lectura.fecha_lectura, EXCLUDED.fecha_lectura) ELSE NULL END
          RETURNING notificacion_id_fk AS id, leida, fecha_lectura`,
        values: [uvus, id, leida],
      });
      if (id !== null && !rows.length) throw Object.assign(new Error('Notificación no disponible para el usuario.'), { statusCode: 404 });
      return id === null ? { actualizadas: rows.length } : rows[0];
    } finally { await conexion.end(); }
  }

  async crearNotificacionesUsuario(uvus, contenido, receptor) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `insert into notificacion (usuario_id_fk, contenido, receptor) values ((select id from usuario where nombre_usuario = $1), $2, $3)`,
        values: [uvus, contenido, receptor],
      };
      await conexion.query(query);
      try {
        const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
        await sendMessage(chatIdUsuario, `Se ha creado una nueva notificación: ${contenido}.\n Se han mandado a todos los usuarios con el rol ${receptor}`);
      } catch (error) {
        console.error("Error al enviar el mensaje de solucionar incidencia:", error);
      }
      var usuariosQuery;
      if (receptor === 'all') {
        usuariosQuery = {
          text: `SELECT u.nombre_usuario, u.chatid 
                 FROM usuario u
                 WHERE u.chatid IS NOT NULL`,
        };
      } 
      else{
      usuariosQuery = {
        text: `SELECT u.nombre_usuario, u.chatid 
               FROM usuario u
               INNER JOIN roles r ON u.id = r.usuario_id_fk
               WHERE r.rol = $1 AND u.chatid IS NOT NULL`,
        values: [receptor],
      };
    }
      const usuariosRes = await conexion.query(usuariosQuery);
      // Enviar el mensaje a cada usuario con ese rol
      for (const usuario of usuariosRes.rows) {
        try {
          await sendMessage(usuario.chatid, `Nueva notificación:\n ${contenido}`);
        } catch (error) {
          console.error(`Error enviando mensaje a ${usuario.nombre_usuario}:`, error);
        }
      }
      return "Se ha creado la notificación y enviado por Telegram correctamente";
    } catch (error) {
      console.error("Error al crear la notificación:", error);
      throw new Error("Error al crear la notificación");
    } finally {
      await conexion.end();
    }
  }

  async notificarCierreIncidencia(idIncidencia, contenido) {
    const conexion = await database.connectPostgreSQL();
    try {
      await eventosNotificacion.registrar(conexion, { origen: 'incidencia', ids: [idIncidencia],
        evento: 'cerrada', contenido: `Incidencia #${idIncidencia} cerrada: ${contenido}` });
      // Obtener el usuario que abrió la incidencia
      const queryUsuario = {
        text: `SELECT u.nombre_usuario, u.chatid
               FROM usuario u
               INNER JOIN incidencia_usuario iu ON iu.usuario_id_fk = u.id
               WHERE iu.id = $1 AND u.chatid IS NOT NULL`,
        values: [idIncidencia],
      };
      const resUsuario = await conexion.query(queryUsuario);
      if (resUsuario.rows.length > 0) {
        const { nombre_usuario, chatid } = resUsuario.rows[0];
        // Enviar el mensaje por Telegram
        try {
          await sendMessage(chatid, `🔔 Incidencia ${idIncidencia} cerrada:\n${contenido}`);
        } catch (error) {
          console.error("Error enviando mensaje de cierre de incidencia por Telegram:", error);
        }
      }
    } catch (error) {
      console.error("Error al notificar cierre de incidencia:", error);
      throw new Error("Error al notificar cierre de incidencia");
    } finally {
      await conexion.end();
    }
  }
}

const notificacionService = new NotificacionService();
export default notificacionService;
