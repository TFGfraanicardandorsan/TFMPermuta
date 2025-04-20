import database from "../config/database.mjs";
import asignaturaService from "./asignaturaService.mjs";

class SolicitudPermutaService {
     async solicitarPermuta(uvus,asignatura,grupos_deseados) {
        const conexion = await database.connectPostgreSQL();
        matriculado = await asignaturaService.personaMatriculadaEnAsignatura(asignatura);    
        
        if (matriculado === true){    
          const query = {
          text: `SELECT id 
          FROM grupo 
          WHERE id = (SELECT id FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)) 
          AND asignatura_id_fk = (SELECT id FROM asignatura WHERE codigo = $1)`,
          values: [`${asignatura}`,`${uvus}`],
        };
        const grupo_actual = (await conexion.query(query)).rows[0]?.id;
        if (grupos_deseados.includes(grupo_actual)) {
          return "Solicitaste una permuta a tu mismo grupo.";
        }
        const insert = {
          text: `insert into solicitud_permuta (usuario_id_fk ,grupo_solicitante_id_fk, estado, id_asignatura_fk) values ((
          SELECT id FROM usuario WHERE nombre_usuario = $2),(
SELECT id FROM grupo WHERE id in (SELECT grupo_id_fk FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)) AND asignatura_id_fk = 
          (SELECT id FROM asignatura WHERE codigo = $1)),
          'SOLICITADA',
        (Select id from asignatura where codigo = $1))`,
          values: [`${asignatura}`,`${uvus}`],
        };
        await conexion.query(insert);
        for (const grupo of grupos_deseados) {
          const insert = {
            text: `insert into grupo_deseado (solicitud_permuta_id_fk , grupo_id_fk ) values(
            (select id from solicitud_permuta where usuario_id_fk = (select id from usuario where nombre_usuario=$3) and id_asignatura_fk = (select id from asignatura where codigo = $1)),
            (select id from grupo where nombre = $2 and grupo.asignatura_id_fk = (select id from asignatura where codigo = $1)))`,
            values: [`${asignatura}`, `${grupo}`,`${uvus}`],
          };
          const res = await conexion.query(insert);
          
        await conexion.end();
        console.log(res);
        }
      return 'Permuta de la asignatura solicitada.';
      }
    }


async getSolicitudesPermutaInteresantes(uvus) {
  const conexion = await database.connectPostgreSQL();

  // Obtener las asignaturas en las que el usuario está matriculado
  const asignaturasUsuarioQuery = {
    text: `
      SELECT id 
      FROM asignatura 
      WHERE id IN (
        SELECT asignatura_id_fk 
        FROM usuario_asignatura 
        WHERE usuario_id_fk = (
          SELECT id FROM usuario WHERE nombre_usuario = $1
        )
      )
    `,
    values: [uvus],
  };
  const asignaturasUsuario = await conexion.query(asignaturasUsuarioQuery);

  if (asignaturasUsuario.rows.length === 0) {
    await conexion.end();
    return 'El usuario no está matriculado en ninguna asignatura.';
  }

  // Obtener las solicitudes de permuta interesantes para todas las asignaturas del usuario
  const query = {
    text: `
      SELECT sp.id AS solicitud_id, sp.estado, g.nombre AS grupo_solicitante, gd.grupo_id_fk AS grupo_deseado, a.codigo AS codigo_asignatura
      FROM solicitud_permuta sp
      INNER JOIN grupo_deseado gd ON sp.id = gd.solicitud_permuta_id_fk
      INNER JOIN grupo g ON sp.grupo_solicitante_id_fk = g.id
      INNER JOIN asignatura a ON sp.id_asignatura_fk = a.id
      WHERE sp.id_asignatura_fk = ANY($1::int[])
      AND gd.grupo_id_fk = (
        SELECT grupo_id_fk
        FROM usuario_grupo
        WHERE usuario_id_fk = (
          SELECT id FROM usuario WHERE nombre_usuario = $2
        )
      )
      AND sp.usuario_id_fk != (
        SELECT id FROM usuario WHERE nombre_usuario = $2
      )
    `,
    values: [asignaturasUsuario.rows.map(row => row.id), uvus],
  };

  const res = await conexion.query(query);
  await conexion.end();

  return res.rows;
}

}
const solicitudPermutaService = new SolicitudPermutaService();
export default solicitudPermutaService