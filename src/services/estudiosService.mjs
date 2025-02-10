import database from "../config/database.mjs";

class EstudiosService{
    async obtenerMiEstudioUsuario() {
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select e.nombre from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario ='fraanicar');`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }    
}
const estudiosService = new EstudiosService();
export default estudiosService;