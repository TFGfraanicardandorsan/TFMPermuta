import database from "../config/database.mjs";
class AsignaturaUsuarioService{

async actualizarAsignaturasUsuario(uvus,asignatura) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select count(*) from usuario_asignatura where asignatura_id_fk = (select id from asignatura where codigo = $2) 
      and usuario_id_fk = (select u.id from usuario u where u.nombre_usuario =$1)`,
      values: [`${uvus}`, `${asignatura}`],
    };
    const res = await conexion.query(query);
    if (res.rows[0].count > 0) {
      await conexion.end();
      return 'El usuario ya está en la asignatura';
    }
    try {
    const query = {
      text: `insert into usuario_asignatura values (
              (select u.id from usuario u where u.nombre_usuario =$1),  (select id from asignatura where codigo = $2))`,
      values: [`${uvus}`, `${asignatura}`],
    };
    await conexion.query(query);
    await conexion.end();
    return 'Usuario insertado en la asignatura correctamente';
  } catch (err) {
    console.error(err);
    return 'Se ha producido un error al insertar el usuario en la asignatura';
    }
  }

  async obtenerAsignaturasUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
    const query = {
      text: `select nombre as asignatura, codigo from asignatura (select id from usuario_asignatura where
              (select u.id from usuario u where u.nombre_usuario =$1))`,
      values: [`${uvus}`],
    };
    await conexion.query(query);
    await conexion.end();
    const res = await conexion.query(query);
    return res.rows; 
  } catch (err) {
    console.error(err);
    return 'Se ha producido un error al conseguir las asignaturas del usuario';
    }
  }

}


const asignaturaUsuarioService = new AsignaturaUsuarioService();
export default asignaturaUsuarioService;