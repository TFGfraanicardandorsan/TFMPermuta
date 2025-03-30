import database from "../config/database.mjs";

class AsignaturaService{
    async obtenerAsignaturasMiEstudioUsuario(uvus) {
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select nombre,siglas, curso, codigo  
          from asignatura a 
          where a.id in (select asignatura_id from asignatura_estudios ae 
                where ae.estudios_id = (select e.id  from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario =$1)))`,
          values: [`${uvus}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }
      async personaMatriculadaEnAsignatura(uvus,asignatura){
         const conexion = await database.connectPostgreSQL();
         const query = {
           text: `select nombre,siglas, curso, codigo from asignatura a 
           where a.id in (select asignatura_id from asignatura_estudios ae 
           where ae.estudios_id = (select e.id  from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario =$2)) ) and a.codigo= $1 ;`,
           values: [`${asignatura}`,`${uvus}`],
         };
         const res = await conexion.query(query);
         await conexion.end();
         if (res.rows.length === 0){
           return false;
         }
         return res.rows;
     }
     async asignaturasPermutables(){
      const conexion = await database.connectPostgreSQL();
      const query = {
        text: ` SELECT a.nombre, a.siglas, a.curso, a.codigo
                FROM asignatura a
                JOIN grupo g ON a.id = g.asignatura_id_fk
                GROUP BY a.nombre, a.siglas, a.curso, a.codigo
                HAVING COUNT(g.id) > 1
                ORDER BY a.curso`,
      };
      const res = await conexion.query(query);
      await conexion.end();
      if (res.rows.length === 0){
        return false;
      }
      return res.rows;
  }
}
const asignaturaService = new AsignaturaService();
export default asignaturaService;