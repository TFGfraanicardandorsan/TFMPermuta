import database from "../config/database.mjs";
class AsignaturaUsuarioService{

async actualizarAsignaturasUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `insert usuario_asignatura a values ((select u.estudios_id_fk  from usuario u where u.nombre_usuario =$1),
    (select id from asignatura where codigo = $2))`,
      values: [`${uvus}`, `${asignatura}`],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }
}