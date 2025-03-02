import database from "../config/database.mjs";
class UsuarioService{

async obtenerDatosUsuario() {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `SELECT u.nombre_completo, u.correo, u.imagen, e.nombre  
             FROM Usuario u  
             LEFT JOIN estudios e ON u.estudios_id_fk = e.id  
             WHERE u.nombre_usuario = 'fraanicar'`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerMisAsignaturasUsuario() {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `SELECT * FROM Usuario`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async actualizarEstudiosUsuario(estudio){
    const conexion = await database.connectPostgreSQL();
    const prueba = {
      text: `select estudios_id_fk from usuario u where u.nombre_usuario ='fraanicar'`,
    };
    const resPrueba = await conexion.query(prueba);
    if (resPrueba===null){
      const query = {
        text: `Update usuario u set = $1 where u.nombre_usuario ='fraanicar'`,
        values: [`${estudio}`],
      };
      const res = await conexion.query(query);
      await conexion.end();
      return 'Estudios seleccionados';
    }
    return 'No puedes cambiar los estudios ya seleccionados ponte en contacto con un administrador a través de una incidencia';
  }
}
const usuarioService = new UsuarioService();
export default usuarioService;