import database from "../config/database.mjs";

class NotificacionService{
      async getNotificacionesUsuario(uvus){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select id,contenido,fecha_creacion from notificacion n where receptor = (select rol  from roles r where usuario_id_fk = (select id from usuario u where u.nombre_usuario =$1) ) or receptor = 'all' order by fecha_creacion desc`,
          values: [`${uvus}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }
      async crearNotificacionesUsuario(uvus,contenido,receptor){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `insert into notificacion (usuario_id_fk, contenido, receptor) values ( (select id from usuario where nombre_usuario = $1), $2, $3)`,
          values: [`${uvus}`, `${contenido}`, `${receptor}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return 'Se ha creado la notificación correctamente';      
      }
    }
const notificacionService = new NotificacionService();
export default notificacionService