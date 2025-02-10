import database from "../config/database.mjs";

class IncidenciaService{
    async getIncidencias(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select * from incidencia`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }
}
const incidenciaService = new IncidenciaService();
export default incidenciaService;