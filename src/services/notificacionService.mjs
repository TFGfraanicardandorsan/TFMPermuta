import database from "../config/database.mjs";
import autorizacionService from "./autorizacionService.mjs";
import { sendMessage } from "./telegramService.mjs";

class NotificacionService {
  async getNotificacionesUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `select id,contenido,fecha_creacion from notificacion n where receptor = (select rol  from roles r where usuario_id_fk = (select id from usuario u where u.nombre_usuario =$1) ) or receptor = 'all' order by fecha_creacion desc`,
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
      return "Se ha creado la notificación correctamente";
    } catch (error) {
      console.error("Error al crear la notificación:", error);
      throw new Error("Error al crear la notificación");
    } finally {
      await conexion.end();
    }
  }
}
const notificacionService = new NotificacionService();
export default notificacionService;
