import database from "../config/database.mjs";
class UsuarioService{

async obtenerDatosUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `SELECT u.nombre_completo, u.correo, u.imagen, e.nombre as titulacion  
             FROM Usuario u  
             LEFT JOIN estudios e ON u.estudios_id_fk = e.id  
             WHERE u.nombre_usuario = ($1)`,
             values: [`${uvus}`],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows[0];
  }

  async actualizarEstudiosUsuario(uvus,estudio){
    const conexion = await database.connectPostgreSQL();
    const queryUsuario = {
      text: `select estudios_id_fk from usuario u where u.nombre_usuario =$1`,
      values: [`${uvus}`],
    };
    const resQueryUsuario = await conexion.query(queryUsuario);
    if (resQueryUsuario.rows[0]=== null){
      const query = {
        text: `Update usuario u set estudios_id_fk =(select id from estudios where nombre = $1) where u.nombre_usuario =$2`,
        values: [`${estudio}`, `${uvus}`],
      };
      await conexion.query(query);
      await conexion.end();
      return 'Estudios seleccionados';
    }
    return resQueryUsuario.rows[0];
  }
}
const usuarioService = new UsuarioService();
export default usuarioService;