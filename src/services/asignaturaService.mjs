import database from "../config/database.mjs";

class AsignaturaService{
    async obtenerAsignaturasNoMatriculadas(uvus) {
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select nombre,siglas, curso, codigo  
          from asignatura a 
          where a.id in (select asignatura_id from asignatura_estudios ae 
                where ae.estudios_id = (select e.id  from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario =$1)))`,
          values: [uvus],
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
           values: [asignatura,uvus],
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
async asignaturasPermutablesUsuario(uvus){
  const conexion = await database.connectPostgreSQL();
  const query = {
    text: `SELECT a.nombre, a.siglas, a.curso, a.codigo
            FROM asignatura a
            JOIN grupo g ON a.id = g.asignatura_id_fk
            WHERE g.id IN (SELECT grupo_id_fk FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1))
            GROUP BY a.nombre, a.siglas, a.curso, a.codigo
            HAVING COUNT(g.id) > 1
            ORDER BY a.curso`,
    values: [uvus],
  };
  const res = await conexion.query(query);
  await conexion.end();
  if (res.rows.length === 0){
    return false;
  }
  return res.rows;
}
async obtenerAsignaturasMiEstudioUsuario(uvus) {
  const conexion = await database.connectPostgreSQL();
  const query = {
    text: `
      SELECT nombre, siglas, curso, codigo  
      FROM asignatura a 
      WHERE a.id IN (
        SELECT asignatura_id 
        FROM asignatura_estudios ae 
        WHERE ae.estudios_id = (
          SELECT e.id  
          FROM estudios e 
          WHERE id = (
            SELECT u.estudios_id_fk  
            FROM usuario u 
            WHERE u.nombre_usuario = $1
          )
        )
      )
      AND a.id NOT IN (
        SELECT asignatura_id_fk 
        FROM usuario_asignatura 
        WHERE usuario_id_fk = (
          SELECT id 
          FROM usuario 
          WHERE nombre_usuario = $1
        )
      )
    `,
    values: [uvus],
  };
  const res = await conexion.query(query);
  await conexion.end();
  return res.rows;
}
async crearAsignatura({ nombre, siglas, curso, codigo }) {
  const conexion = await database.connectPostgreSQL();
  const query = {
    text: `INSERT INTO asignatura (nombre, siglas, curso, codigo) VALUES ($1, $2, $3, $4) RETURNING *`,
    values: [nombre, siglas, curso, codigo],
  };
  try {
    const res = await conexion.query(query);
    return res.rows[0];
  } finally {
    await conexion.end();
  }
}
}
const asignaturaService = new AsignaturaService();
export default asignaturaService;