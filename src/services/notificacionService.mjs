import database from "../config/database.mjs";
import autorizacionService from "./autorizacionService.mjs";
import { sendMessage } from "./telegramService.mjs";
import notificacionService from "./notificacionService.mjs";

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
}

// ...dentro de handleIncomingMessage...

if (text && text.startsWith("/notificar")) {
  if (!usuarioExistente || usuarioExistente.rol !== "administrador") {
    await sendMessage(chatId, "Solo los administradores pueden enviar notificaciones.");
    return;
  }

  // Sintaxis: /notificar receptor mensaje
  const partes = text.split(" ");
  if (partes.length < 3) {
    await sendMessage(chatId, "Uso: /notificar [estudiante|administrador|all] [mensaje]");
    return;
  }
  const receptor = partes[1].toLowerCase();
  let receptorDb;
  if (receptor === "estudiante") receptorDb = "estudiante";
  else if (receptor === "administrador") receptorDb = "administrador";
  else if (receptor === "all" || receptor === "todos") receptorDb = "all";
  else {
    await sendMessage(chatId, "Receptor no válido. Usa estudiante, administrador o all.");
    return;
  }
  const contenido = text.split(" ").slice(2).join(" ");
  if (!contenido) {
    await sendMessage(chatId, "Debes escribir un mensaje para la notificación.");
    return;
  }
  try {
    await notificacionService.crearNotificacionesUsuario(
      usuarioExistente.uvus,
      contenido,
      receptorDb
    );
    await sendMessage(chatId, `✅ Notificación enviada a ${receptorDb}.`);
  } catch (error) {
    await sendMessage(chatId, "❌ Error al enviar la notificación.");
  }
  return;
}

const notificacionService = new NotificacionService();
export default notificacionService;
