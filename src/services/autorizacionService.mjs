import database from "../config/database.mjs";

class AutorizacionService{
async getAutorizacion(sesionid) {
    try {
      const userData = await database.obtenerDatosUsuario(sesionid);
  
      if (!userData) {
        return { err: true, errmsg: 'Esta cuenta no existe' };
      }
      if (userData.estado === 0) {
        return { err: true, errmsg: 'Cuenta deshabilitada' };
      }
  
      const conexion = await database.connectPostgreSQL();
      const query = {
        text: `SELECT f.nombre AS funcionalidad 
        FROM Usuario u 
        JOIN roles r ON u.username = r.username_user 
        JOIN rol_funcionalidad rf ON r.permisos = rf.rol 
        JOIN funcionalidades f ON rf.id_funcionalidad = f.id 
        WHERE u.username = $1`,
        values: [userData.username],
      };
  
      const res = await conexion.query(query);
      await conexion.end();
      return res.rows;
  
    } catch (error) {
      console.error('Error al obtener las autorizaciones:', error);
      return { err: true, errmsg: 'Error al obtener las autorizaciones' };
    }
  }
}
const autorizacionService = new AutorizacionService();
export default autorizacionService;