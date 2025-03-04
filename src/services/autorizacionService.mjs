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
}
const autorizacionService = new AutorizacionService();
export default autorizacionService;