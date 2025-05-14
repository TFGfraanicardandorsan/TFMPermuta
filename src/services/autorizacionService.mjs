import database from "../config/database.mjs";

class AutorizacionService{
  async verificarSiExisteUsuario(uvus){
    try{
      const conexion = await database.connectPostgreSQL();
      const query = {
        text: ` SELECT u.nombre_completo, u.nombre_usuario, r.rol
                FROM usuario u
                LEFT JOIN roles r ON u.id = r.usuario_id_fk
                WHERE u.nombre_usuario = $1`,
                values: [uvus],
      };
      const res = await conexion.query(query);
      await conexion.end();
      return res.rows[0];
    } catch (error){
      console.error('Error al verificar si existe el usuario:', error);
      return { err: true, errmsg: 'Error al verificar si existe el usuario' };
    }
  }

  async verificarSiExisteUsuarioEnTelegram(userId,chatId){
    try{
      const conexion = await database.connectPostgreSQL();
      const query = {
        text: ` SELECT u.nombre_usuario
                FROM usuario u
                WHERE u.userId = $1 
                    AND u.chatId = $2`,
        values: [userId, chatId],
      };
      const res = await conexion.query(query);
      await conexion.end();
      if (res.rows.length > 0) {
        return res.rows[0].nombre_usuario;
      } else {
        return null; // No se encontró el usuario
      }
    } catch (error){
      console.error('Error al verificar si existe el usuario en Telegram:', error);
      return { err: true, errmsg: 'Error al verificar si existe el usuario en Telegram' };
    }
  }

    async obtenerChatIdUsuario(uvus){
    try{
      const conexion = await database.connectPostgreSQL();
      const query = {
        text: ` SELECT chatid FROM usuario WHERE nombre_usuario = $1`,
        values: [uvus],
      };
      const res = await conexion.query(query);
      await conexion.end();
      if (res.rows.length > 0) {
        return res.rows[0].chatid;
      } else {
        return null;
      }
    } catch (error){
      console.error('Error al obtener el chatId del usuario:', error);
      return { err: true, errmsg: 'Error al obtener el chatId del usuario' };
    }
  }

  async consultarSolicitudAltaUsuario(uvusEnviado){
    try{
      const conexion = await database.connectPostgreSQL();
      const query = {
        text: ` SELECT uvus, correo, nombre_completo, chat_id, user_id
                FROM alta_usuario_bot 
                WHERE uvus = $1`,
        values: [uvusEnviado],
      };
      const res = await conexion.query(query);
      await conexion.end();
      if (res.rows.length > 0) {
        return res.rows[0];
      } else {
        return 'No existe ningún usuario';
      }
    } catch (error){
      console.error('Error al consultarSolicitudAltaUsuario:', error);
      return { err: true, errmsg: 'Error al consultarSolicitudAltaUsuario' };
    }
  }

  async insertarSolicitudAltaUsuario(uvusEnviado,nombreCompleto,chatId){
    try{
      const conexion = await database.connectPostgreSQL();
      const correo = `${uvusEnviado}@alum.us.es`;
      const query = {
        text: ` INSERT INTO alta_usuario_bot (uvus, correo, nombre_completo, chat_id, user_id)
                VALUES ($1, $2, $3, $4, $5)`,
        values: [uvusEnviado,correo,nombreCompleto, chatId,chatId],
      };
      await conexion.query(query);
      await conexion.end();
      return 'Se ha insertado la solicitud de alta correctamente';
    } catch (error){
      console.error('Error al insertar la solicitud de alta:', error);
      return { err: true, errmsg: 'Error al insertar la solicitud de alta' };
    }
  }

  async insertarUsuario(uvusEnviado,nombreCompleto,correo,chatId){
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query('BEGIN');
      const queryUsuario = {
        text: ` INSERT INTO usuario (nombre_completo, correo, nombre_usuario, activo, chatid, userid)
                VALUES ($1, $2, $3, true, $4, $5)
                RETURNING id`,
        values: [nombreCompleto, correo, uvusEnviado, chatId, chatId],
      };
      const resultado = await conexion.query(queryUsuario);
      const usuarioId = resultado.rows[0].id;
      const queryRol = {
        text: ` INSERT INTO roles (usuario_id_fk,rol)
                VALUES ($1, 'estudiante')`,
        values: [usuarioId],
      };
      await conexion.query(queryRol);
      await conexion.query('COMMIT');
      return 'Se ha insertado el usuario correctamente';
    } catch (error){
      await conexion.query('ROLLBACK');
      console.error('Error al insertar el usuario:', error);
      throw new Error("Error al crear la incidencia");
    } finally {
      await conexion.end();
    }
  }

  async eliminarSolicitudAltaUsuario(uvus){
    try{
      const conexion = await database.connectPostgreSQL();
      const query = {
        text: ` DELETE
                FROM alta_usuario_bot
                WHERE uvus = $1`,
        values: [uvus],
      };
      await conexion.query(query);
      await conexion.end();
      return 'Se ha eliminado el alta de usuario correctamente'
    } catch (error){
      console.error('Error al eliminar el alta de usuario:', error);
      return { err: true, errmsg: 'Error al eliminar el alta de usuario' };
    }
  }
}
const autorizacionService = new AutorizacionService();
export default autorizacionService;