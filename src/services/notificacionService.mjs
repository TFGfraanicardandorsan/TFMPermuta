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
}
const notificacionService = new NotificacionService();
export default notificacionService