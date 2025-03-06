import database from "../config/database.mjs";

class EstudiosService{
    async obtenerMiEstudioUsuario(uvus) {
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select e.nombre from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario =$1);`,
          values: [`${uvus}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }   
      async obtenerEstudios() {
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select e.nombre from estudios e;`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }  
}
const estudiosService = new EstudiosService();
export default estudiosService;