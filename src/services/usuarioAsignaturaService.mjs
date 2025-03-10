import database from "../config/database.mjs";
class AsignaturaUsuarioService{

async actualizarAsignaturasUsuario(uvus,asignatura) {
    const conexion = await database.connectPostgreSQL();
    try {
    const query = {
      text: `insert usuario_asignatura a values (
              (select u.estudios_id_fk  from usuario u where u.nombre_usuario =$1),  (select id from asignatura where codigo = $2))`,
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
}
const asignaturaUsuarioService = new AsignaturaUsuarioService();
export default asignaturaUsuarioService;