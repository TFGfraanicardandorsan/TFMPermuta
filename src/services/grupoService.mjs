import database from "../config/database.mjs";

class GrupoService{
    async getGruposPorAsignatura(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select * from grupo where asignatura = (Select id from asignatura where codigo = $1)`,
          values: [`${asignatura}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }
}
const grupoService = new GrupoService();
export default grupoService;