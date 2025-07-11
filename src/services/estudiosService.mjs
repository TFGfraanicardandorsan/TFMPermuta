import database from "../config/database.mjs";

class EstudiosService {
  async obtenerMiEstudioUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select e.nombre from estudios e 
          where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario =$1)`,
      values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }
  
  async obtenerEstudios() {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select e.id, e.nombre from estudios e`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async insertarEstudio(estudio, siglas) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `insert into estudios (nombre, siglas) values ($1, $2) returning id`,
        values: [estudio, siglas],
      };
      const res = await conexion.query(query);
      if (res.rows.length === 0) {
        return false;
      }
      return res.rows;
    } catch (error) {
      console.error("Error al insertar el estudio:", error);
      throw new Error("Error al insertar el estudio");
    } finally {
      await conexion.end();
    }
  }
}
const estudiosService = new EstudiosService();
export default estudiosService;
