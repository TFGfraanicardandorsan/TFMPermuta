import database from "../config/database.mjs";

class SolicitudPermutaService {
     async solicitarPermuta(uvus,asignatura,grupos_deseados) {
        const conexion = await database.connectPostgreSQL();
        console.log(uvus,asignatura,grupos_deseados);
        const insert = {
          text: `insert into solicitud_permuta (usuario_id_fk ,grupo_solicitante_id_fk, estado, id_asignatura_fk) values ((
          SELECT id FROM usuario WHERE nombre_usuario = $2),(
SELECT id FROM grupo WHERE id in (SELECT grupo_id_fk FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)) AND asignatura_id_fk = 
          (SELECT id FROM asignatura WHERE codigo = $1)),
          'SOLICITADA',
        (Select id from asignatura where codigo = $1))`,
          values: [`${asignatura}`,`${uvus}`],
        };
        console.log("Funciona");
        await conexion.query(insert);
        console.log("Funciona2");
        for (const grupo of grupos_deseados) {
          const insert = {
            text: `insert into grupo_deseado (solicitud_permuta_id_fk , grupo_id_fk ) values(
            (select id from solicitud_permuta where usuario_id_fk = (select id from usuario where nombre_usuario=$3) and id_asignatura_fk = (select id from asignatura where codigo = $1)),
            (select id from grupo where nombre = $2 and grupo.asignatura_id_fk = (select id from asignatura where codigo = $1)))`,
            values: [`${asignatura}`, `${grupo}`,`${uvus}`],
          };
          console.log("Funciona3");
          const res = await conexion.query(insert);
          
        await conexion.end();
        console.log(res);
        }
      return 'Permuta de la asignatura solicitada.';
      
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

async getMisSolicitudesPermuta(uvus) {
  const conexion = await database.connectPostgreSQL();
  const query = {
    text: `
      SELECT 
        sp.id AS solicitud_id, 
        sp.estado, 
        g_solicitante.nombre AS grupo_solicitante, 
        g_deseado.nombre AS grupo_deseado,
        a.codigo AS codigo_asignatura, 
        a.nombre AS nombre_asignatura
      FROM solicitud_permuta sp
      INNER JOIN grupo g_solicitante ON sp.grupo_solicitante_id_fk = g_solicitante.id
      INNER JOIN grupo_deseado gd ON sp.id = gd.solicitud_permuta_id_fk
      INNER JOIN grupo g_deseado ON gd.grupo_id_fk = g_deseado.id
      INNER JOIN asignatura a ON sp.id_asignatura_fk = a.id
      WHERE sp.usuario_id_fk = (
        SELECT id FROM usuario WHERE nombre_usuario = $1
      )
      ORDER BY sp.id, g_deseado.nombre
    `,
    values: [uvus],
  };

  const res = await conexion.query(query);
  
  // Agrupar los resultados por solicitud
  const solicitudesAgrupadas = res.rows.reduce((acc, row) => {
    const solicitudExistente = acc.find(s => s.solicitud_id === row.solicitud_id);
    
    if (solicitudExistente) {
      solicitudExistente.grupos_deseados.push(row.grupo_deseado);
    } else {
      acc.push({
        solicitud_id: row.solicitud_id,
        estado: row.estado,
        grupo_solicitante: row.grupo_solicitante,
        grupos_deseados: [row.grupo_deseado],
        codigo_asignatura: row.codigo_asignatura,
        nombre_asignatura: row.nombre_asignatura
      });
    }
    
    return acc;
  }, []);

  await conexion.end();
  return solicitudesAgrupadas;
}

async aceptarSolicitudPermuta(uvus, solicitud) {
  const conexion = await database.connectPostgreSQL();
  const update = {
    text: `update solicitud_permuta set estado = 'ACEPTADA' where id = $1`,
    values: [`${solicitud}`],
  };
  await conexion.query(update);
  await conexion.end();
  return 'Solicitud de permuta aceptada.';
}
async rechazarSolicitudPermuta(uvus, solicitud) {
  const conexion = await database.connectPostgreSQL();
  const update = {
    text: `update solicitud_permuta set estado = 'RECHAZADA' where id = $1`,
    values: [`${solicitud}`],
  };
  await conexion.query(update);
  await conexion.end();
  return 'Solicitud de permuta rechazada.';
}

}
const solicitudPermutaService = new SolicitudPermutaService();
export default solicitudPermutaService