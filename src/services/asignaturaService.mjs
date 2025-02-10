import database from "../config/database.mjs";

class AsignaturaService{
    async obtenerAsignaturasMiEstudioUsuario() {
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select * 
          from asignatura a 
          where a.id in (select asignatura_id from asignatura_estudios ae where ae.estudios_id = (select e.id  from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario ='fraanicar')))`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }
      async personaMatriculadaEnAsignatura(asignatura){
         const conexion = await database.connectPostgreSQL();
         const query = {
           text: `select * from asignatura a where a.id in (select asignatura_id from asignatura_estudios ae where ae.estudios_id = (select e.id  from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario ='fraanicar')) ) and a.codigo= $1 ;`,
           values: [`${asignatura}`],
         };
         const res = await conexion.query(query);
         await conexion.end();ç
         if (res.length == 0){
           return false;
         }
         return true;
     }
}
const asignaturaService = new AsignaturaService();
export default asignaturaService;