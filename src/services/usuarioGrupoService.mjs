import database from "../config/database.mjs";

class UsuarioGrupoService{ 
async añadirGrupoAsignatura(uvus, grupo, asignatura) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `insert into usuario_grupo (usuario_id_fk, grupo_id_fk ) values (
      (select id from usuario where nombre_usuario=$1), 
      (select id from grupo g  where g.nombre = $2 and g.asignatura_id_fk = (select id from asignatura where codigo =$3 )))`,
      values: [`${uvus}`, `${grupo}`, `${asignatura}`],
    };
    await conexion.query(query);
    await conexion.end();
    
}
}