import database from "../config/database.mjs";
import autorizacionService from "./autorizacionService.mjs";
import { sendMessage } from "./telegramService.mjs";

class NotificacionService {
  async getNotificacionesUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `select id,contenido,fecha_creacion from notificacion n where (receptor = (select rol  from roles r where usuario_id_fk = (select id from usuario u where u.nombre_usuario =$1) ) or receptor = 'all') AND (fecha_expiracion IS NULL OR fecha_expiracion >= NOW()) order by fecha_creacion desc`,
        values: [uvus],
      };
      const res = await conexion.query(query);
      return res.rows;
    } catch (error) {
      console.error("Error al obtener las notificaciones:", error);
      throw new Error("Error al obtener las notificaciones");
    } finally {
      await conexion.end();
    }
  }  async getNotificacionesUsuarioTelegram(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `select id,contenido,fecha_creacion from notificacion n where (receptor = (select rol  from roles r where usuario_id_fk = (select id from usuario u where u.nombre_usuario =$1) ) or receptor = 'all') AND (fecha_expiracion IS NULL OR fecha_expiracion >= NOW()) order by fecha_creacion asc`,
        values: [uvus],
      };
      const res = await conexion.query(query);
      return res.rows;
    } catch (error) {
      console.error("Error al obtener las notificaciones:", error);
      throw new Error("Error al obtener las notificaciones");
    } finally {
      await conexion.end();
    }
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

  async notificarCierreIncidencia(incidenciaId, contenido) {
    const conexion = await database.connectPostgreSQL();
    console.log("Notificando cierre de incidencia:", incidenciaId, contenido);
    try {
      // Obtener el usuario que abrió la incidencia
      const queryUsuario = {
        text: `SELECT u.nombre_usuario, u.chatid
               FROM usuario u
               INNER JOIN incidencia_usuario iu ON iu.usuario_id_fk = u.id
               WHERE iu.id = $1 AND u.chatid IS NOT NULL`,
        values: [incidenciaId],
      };
      const resUsuario = await conexion.query(queryUsuario);
      if (resUsuario.rows.length > 0) {
        const { nombre_usuario, chatid } = resUsuario.rows[0];
        // Enviar el mensaje por Telegram
        try {
          await sendMessage(chatid, `🔔 Incidencia ${incidenciaId} cerrada:\n${contenido}`);
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
