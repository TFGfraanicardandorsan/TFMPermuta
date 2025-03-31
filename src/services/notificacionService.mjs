import database from "../config/database.mjs";

class NotificacionService{
    async getNotificaciones(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select * from notificacion`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }

      async getNotificacionesUsuario(uvus){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select contenido,fecha_creacion from notificacion n where receptor = (select rol  from roles r where usuario_id_fk = (select id from usuario u where u.nombre_usuario =$1) ) or receptor = 'all'`,
          values: [`${uvus}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }
}
const notificacionService = new NotificacionService();
export default notificacionService