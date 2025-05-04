import database from "../config/database.mjs";
import PermutaMatching from "../algorithm/AlgoritmoCruzadoSolicitudes.mjs";

class SolicitudPermutaService {
     async solicitarPermuta(uvus,asignatura,grupos_deseados) {
        const conexion = await database.connectPostgreSQL();
        const insert_solicitud_permuta = {
          text: `insert into solicitud_permuta (usuario_id_fk ,grupo_solicitante_id_fk, estado, id_asignatura_fk) values ((
          SELECT id FROM usuario WHERE nombre_usuario = $2),
          (SELECT id FROM grupo WHERE id in (SELECT grupo_id_fk FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)) AND asignatura_id_fk = 
          (SELECT id FROM asignatura WHERE codigo = $1)),
          'SOLICITADA',
        (Select id from asignatura where codigo = $1)) returning id`,
          values: [asignatura,uvus],
        };
        const res_solicitud_permuta = await conexion.query(insert_solicitud_permuta);
        const id = res_solicitud_permuta.rows[0].id;
        for (const grupo of grupos_deseados) {
          const insertGrupoDeseado = {
            text: `insert into grupo_deseado (solicitud_permuta_id_fk , grupo_id_fk ) 
            values(
              $3,
              (select id from grupo where nombre = $2 and grupo.asignatura_id_fk = (select id from asignatura where codigo = $1)))`,
            values: [asignatura, grupo, id],
          };
          await conexion.query(insertGrupoDeseado);
        }
        await conexion.end();
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
  const asignaturaUsuario = asignaturasUsuario.rows.map(row => row.id).join(',');
  const query = {
    text: `
      SELECT sp.id AS solicitud_id, sp.estado, g.nombre AS grupo_solicitante, gd.grupo_id_fk AS grupo_deseado, a.codigo AS codigo_asignatura
      FROM solicitud_permuta sp
      INNER JOIN grupo_deseado gd ON sp.id = gd.solicitud_permuta_id_fk
      INNER JOIN grupo g ON sp.grupo_solicitante_id_fk = g.id
      INNER JOIN asignatura a ON sp.id_asignatura_fk = a.id
      WHERE sp.id_asignatura_fk in ($1)
      AND gd.grupo_id_fk in (
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
    values: [asignaturaUsuario, uvus],
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
    text: ` insert into permuta id, usuario_id_1_fk, usuario_id_2_fk,asignatura_id_fk, grupo_id_1_fk, grupo_id_2_fk, estado, aceptada_1, aceptada_2) values (
      (select id from solicitud_permuta where id = $1),
      (select usuario_id_fk from solicitud_permuta where id = $1),
      (select usuario_id_fk from grupo_deseado where solicitud_permuta_id_fk = $1),
      (select id_asignatura_fk from solicitud_permuta where id = $1),
      (select grupo_solicitante_id_fk from solicitud_permuta where id = $1),
      (select grupo_id_fk from grupo_deseado where solicitud_permuta_id_fk = $1),
      'ACEPTADA',
      true,
      false
    )`,
    values: [`${solicitud}`, `${uvus}`],
  };
  await conexion.query(update);
  await conexion.end();
  return 'Solicitud de permuta aceptada.';
}
async rechazarSolicitudPermuta(uvus, solicitud) {
  const conexion = await database.connectPostgreSQL();
  const update = {
    text: `update permuta set estado = 'RECHAZADA' where id = $1 and usurio_id_1_fk = (select id from usuario where nombre_usuario = $2)`,
    values: [`${solicitud}`, `${uvus}`],
  };
  await conexion.query(update);
  await conexion.end();
  return 'Solicitud de permuta rechazada.';
}

async validarSolicitudPermuta(uvus, solicitud) {
  const conexion = await database.connectPostgreSQL();
  const update = {
    text: `update permuta set estado = 'VALIDADA', aceptada_2 = true where id = $1 and usuario_id_2_fk = (select id from usuario where nombre_usuario = $2)`,
    values: [`${solicitud}`, `${uvus}`],
  };
  await conexion.query(update);
  const updateSolicitud = {
    text: `update solicitud_permuta set estado = 'ACEPTADA' where id = $1`,
    values: [`${solicitud}`],
  };
  await conexion.query(updateSolicitud);
  await conexion.end();
  return 'Solicitud de permuta validada.';
}
async verListaPermutas(uvus) {
  const conexion = await database.connectPostgreSQL();
  const query = {
    text: `
      SELECT 
        p.id AS permuta_id,
        u1.nombre_completo AS usuario_1_nombre,
        u1.nombre_usuario AS usuario_1_uvus,
        e1.siglas AS usuario_1_estudio,
        u2.nombre_completo AS usuario_2_nombre,
        u2.nombre_usuario AS usuario_2_uvus,
        e2.siglas AS usuario_2_estudio,
        a.nombre AS nombre_asignatura,
        a.codigo AS codigo_asignatura
      FROM permuta p
      INNER JOIN usuario u1 ON p.usuario_id_1_fk = u1.id
      INNER JOIN usuario u2 ON p.usuario_id_2_fk = u2.id
      INNER JOIN estudios e1 ON u1.estudios_id_fk = e1.id
      INNER JOIN estudios e2 ON u2.estudios_id_fk = e2.id
      INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
      WHERE p.usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
         OR p.usuario_id_2_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
      ORDER BY p.usuario_id_1_fk, p.usuario_id_2_fk, p.id
    `,
    values: [`${uvus}`],
  };

  const res = await conexion.query(query);

  // Agrupar las permutas por usuario_1 y usuario_2
  const permutasAgrupadas = res.rows.reduce((acc, row) => {
    const key = `${row.usuario_1_uvus}-${row.usuario_2_uvus}`;
    if (!acc[key]) {
      acc[key] = {
        usuarios: [
          {
            nombre_completo: row.usuario_1_nombre,
            uvus: row.usuario_1_uvus,
            estudio: row.usuario_1_estudio,
          },
          {
            nombre_completo: row.usuario_2_nombre,
            uvus: row.usuario_2_uvus,
            estudio: row.usuario_2_estudio,
          },
        ],
        permutas: [],
      };
    }
    acc[key].permutas.push({
      nombre_asignatura: row.nombre_asignatura,
      codigo_asignatura: row.codigo_asignatura,
      permuta_id: row.permuta_id,
    });
    return acc;
  }, {});

  await conexion.end();

  // Convertir el objeto agrupado en una lista de listas
  return Object.values(permutasAgrupadas);
}
async proponerPermutas() {
  const conexion = await database.connectPostgreSQL();
  
  // 1. Obtener todas las solicitudes de permuta activas
  const solicitudesQuery = {
    text: `
      SELECT 
        sp.id,
        u.id as estudiante_id,
        sp.id_asignatura_fk as asignatura,
        g.nombre as permuta_a
      FROM solicitud_permuta sp
      INNER JOIN usuario u ON sp.usuario_id_fk = u.id
      INNER JOIN grupo_deseado gd ON sp.id = gd.solicitud_permuta_id_fk
      INNER JOIN grupo g ON gd.grupo_id_fk = g.id
      WHERE sp.estado = 'SOLICITADA'
    `
  };

  const estudiantesQuery = {
    text: `
      SELECT DISTINCT 
        u.id,
        u.nombre_usuario,
        g.nombre as grupo
      FROM usuario u
      INNER JOIN usuario_grupo ug ON u.id = ug.usuario_id_fk
      INNER JOIN grupo g ON ug.grupo_id_fk = g.id
    `
  };

  const [solicitudesRes, estudiantesRes] = await Promise.all([
    conexion.query(solicitudesQuery),
    conexion.query(estudiantesQuery)
  ]);

  // 2. Preparar los datos para el algoritmo
  const estudiantes = estudiantesRes.rows;
  const permutas = solicitudesRes.rows.map(s => ({
    estudianteId: s.estudiante_id,
    permutaA: s.permuta_a,
    asignatura: s.asignatura
  }));

  // 3. Ejecutar el algoritmo de matching
  const permutaMatching = new PermutaMatching(estudiantes, permutas);
  permutaMatching.construirGrafo();
  const permutasOptimas = permutaMatching.emparejar();

  // 4. Registrar las permutas propuestas en la base de datos
  for (const permuta of permutasOptimas) {
    const insertPermutaQuery = {
      text: `
        INSERT INTO permuta (
          id,
          usuario_id_1_fk,
          usuario_id_2_fk,
          asignatura_id_fk,
          grupo_id_1_fk,
          grupo_id_2_fk,
          estado,
          aceptada_1,
          aceptada_2
        ) VALUES (
          DEFAULT,
          $1,
          $2,
          $3,
          (SELECT grupo_id_fk FROM usuario_grupo WHERE usuario_id_fk = $1 AND asignatura_id_fk = $3),
          (SELECT grupo_id_fk FROM usuario_grupo WHERE usuario_id_fk = $2 AND asignatura_id_fk = $3),
          'PROPUESTA',
          false,
          false
        )
      `,
      values: [permuta.estudiante1, permuta.estudiante2, permuta.asignaturas[0]]
    };

    await conexion.query(insertPermutaQuery);
  }

  await conexion.end();
  return permutasOptimas;
}
async aceptarPermutaPropuesta(uvus, permutaId) {
  const conexion = await database.connectPostgreSQL();
  try {
    // Verificar si el usuario es parte de la permuta
    const verificarUsuarioQuery = {
      text: `
        SELECT 
          CASE 
            WHEN usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1) THEN 'usuario1'
            WHEN usuario_id_2_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1) THEN 'usuario2'
            ELSE NULL
          END as tipo_usuario,
          estado,
          aceptada_1,
          aceptada_2
        FROM permuta
        WHERE id = $2 AND estado = 'PROPUESTA'
      `,
      values: [uvus, permutaId]
    };

    const res = await conexion.query(verificarUsuarioQuery);
    
    if (res.rows.length === 0) {
      throw new Error('La permuta propuesta no existe o ya no está en estado PROPUESTA');
    }

    const { tipo_usuario, aceptada_1, aceptada_2 } = res.rows[0];
    
    if (!tipo_usuario) {
      throw new Error('No eres participante de esta permuta');
    }

    // Actualizar el estado de aceptación según el usuario
    const updateQuery = {
      text: `
        UPDATE permuta 
        SET ${tipo_usuario === 'usuario1' ? 'aceptada_1' : 'aceptada_2'} = true,
            estado = CASE 
              WHEN ${tipo_usuario === 'usuario1' ? 'aceptada_2' : 'aceptada_1'} = true 
              THEN 'VALIDADA' 
              ELSE 'PROPUESTA' 
            END
        WHERE id = $1
      `,
      values: [permutaId]
    };

    await conexion.query(updateQuery);
    await conexion.end();
    
    return 'Has aceptado la permuta propuesta';
  } catch (error) {
    await conexion.query('ROLLBACK');
    throw error;
  } finally {
    await conexion.end();
  }
}

async rechazarPermutaPropuesta(uvus, permutaId) {
  const conexion = await database.connectPostgreSQL();
  try {
    // Verificar si el usuario es parte de la permuta
    const verificarUsuarioQuery = {
      text: `
        SELECT 1
        FROM permuta
        WHERE id = $1 
        AND estado = 'PROPUESTA'
        AND (
          usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)
          OR usuario_id_2_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)
        )
      `,
      values: [permutaId, uvus]
    };

    const res = await conexion.query(verificarUsuarioQuery);
    
    if (res.rows.length === 0) {
      throw new Error('La permuta propuesta no existe, ya no está en estado PROPUESTA o no eres participante');
    }

    // Actualizar el estado de la permuta a RECHAZADA
    const updateQuery = {
      text: `
        UPDATE permuta 
        SET estado = 'RECHAZADA'
        WHERE id = $1
      `,
      values: [permutaId]
    };

    await conexion.query(updateQuery);
    await conexion.end();
    
    return 'Has rechazado la permuta propuesta';
  } catch (error) {
    await conexion.query('ROLLBACK');
    throw error;
  } finally {
    await conexion.end();
  }
}
}
const solicitudPermutaService = new SolicitudPermutaService();
export default solicitudPermutaService