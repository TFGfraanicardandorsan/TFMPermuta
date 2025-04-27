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
                values: [`${uvus}`],
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
}
const autorizacionService = new AutorizacionService();
export default autorizacionService;