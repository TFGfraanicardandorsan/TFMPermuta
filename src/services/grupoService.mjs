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
      async añadirMisGrupos(num_grupo,codigo){
        const conexion = await database.connectPostgreSQL();
        const insert = {
          text: `insert into usuario_grupo (usuario_id_fk, grupo_id_fk ) values (
          (select id from usuario where nombre_usuario='fraanicar'), 
          (select id from grupo g  where g.nombre = $1 and g.asignatura_id_fk = (select id from asignatura where codigo =$2 )))`,
          values: [`${num_grupo}`, `${codigo}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }

}
const grupoService = new GrupoService();
export default grupoService;