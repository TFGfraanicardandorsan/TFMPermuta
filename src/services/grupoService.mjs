import database from "../config/database.mjs";

class GrupoService{
    async obtenerGruposPorAsignatura(asignatura){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select id,nombre as numGrupo from grupo where asignatura_id_fk = (Select id from asignatura where codigo = $1)`,
          values: [`${asignatura}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }
      async añadirMisGrupos(uvus,num_grupo,codigo){
        const conexion = await database.connectPostgreSQL();
        const insert = {
          text: `insert into usuario_grupo (usuario_id_fk, grupo_id_fk ) values (
          (select id from usuario where nombre_usuario=$3), 
          (select id from grupo g  where g.nombre = $1 and g.asignatura_id_fk = (select id from asignatura where codigo =$2 )))`,
          values: [`${num_grupo}`, `${codigo}`, `${uvus}`],
        };
        await conexion.query(insert);
        await conexion.end();
      }

      async obtenerMiGrupoAsignatura(uvus){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select g.nombre as numGrupo , a.nombre as titulacion from grupo g left join asignatura a on a.id = g.asignatura_id_fk 
          where g.id in (select ug.grupo_id_fk  from usuario_grupo ug where ug.usuario_id_fk = (select id from usuario u where u.nombre_usuario = $1));`,
          values: [`${uvus}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }
      
}
const grupoService = new GrupoService();
export default grupoService;