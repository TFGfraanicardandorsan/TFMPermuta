import database from "../config/database.mjs";
import { mensajeGradoSeleccionado } from "../utils/mensajesTelegram.mjs";
import { sendMessage } from "./telegramService.mjs";
class UsuarioService{

async obtenerDatosUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `SELECT u.nombre_completo, u.correo, e.nombre as titulacion, e.siglas  
             FROM Usuario u  
             LEFT JOIN estudios e ON u.estudios_id_fk = e.id  
             WHERE u.nombre_usuario = ($1)`,
             values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows[0];
  }

  async obtenerDatosUsuarioAdmin(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `SELECT u.nombre_completo, u.correo
             FROM Usuario u 
             WHERE u.nombre_usuario = ($1)`,
             values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows[0];
  }

  async actualizarEstudiosUsuario(uvus, estudio) {
    const conexion = await database.connectPostgreSQL();
    const queryUsuario = {
      text: `select estudios_id_fk from usuario u where u.nombre_usuario =$1`,
      values: [uvus],
    };
    const resQueryUsuario = await conexion.query(queryUsuario);
    if (resQueryUsuario.rows[0].estudios_id_fk === null) {
      const query = {
        text: `Update usuario u set estudios_id_fk =(select id from estudios where nombre = $1) where u.nombre_usuario =$2`,
        values: [estudio, uvus],
      };
      await conexion.query(query);
      await conexion.end();
      // Enviar mensaje por Telegram
      try {
        const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
        await sendMessage(chatIdUsuario, mensajeGradoSeleccionado(estudio));
      } catch (error) {
        console.error("Error al enviar el mensaje de selección de estudio:", error);
      }
      return 'Estudios seleccionados';
    }
    await conexion.end();
    return 'Ya tienes estudios seleccionados. Ponte en contacto con el administrador si deseas cambiarlos';
  }

  async actualizarCorreoUsuario(uvus, nuevoCorreo) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `UPDATE usuario SET correo = $1 WHERE nombre_usuario = $2`,
        values: [nuevoCorreo, uvus],
      };
      await conexion.query(query);
      return 'Correo actualizado correctamente';
    } finally {
      await conexion.end();
    }
  }
}
const usuarioService = new UsuarioService();
export default usuarioService;