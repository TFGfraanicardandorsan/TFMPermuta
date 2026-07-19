import database from "../config/database.mjs";
import PermutaMatching from "../algorithm/AlgoritmoCruzadoSolicitudes.mjs";
import { mensajeSolicitudPermuta } from "../utils/mensajesTelegram.mjs";
import { sendMessage } from "./telegramService.mjs";
import autorizacionService from "./autorizacionService.mjs";

class SolicitudPermutaService {
  async solicitarPermuta(uvus, asignatura, grupos_deseados) {
    const conexion = await database.connectPostgreSQL();

    // Verificar si ya existe una solicitud activa para esta asignatura y usuario
    const verificarSolicitudQuery = {
      text: `
                SELECT 1 
                FROM solicitud_permuta 
                WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
                AND id_asignatura_fk = (SELECT id FROM asignatura WHERE codigo = $2)
                AND estado = 'SOLICITADA' AND vigente = true
            `,
      values: [uvus, asignatura],
    };

    const verificarSolicitudRes = await conexion.query(verificarSolicitudQuery);

    if (verificarSolicitudRes.rows.length > 0) {
      await conexion.end();
      throw new Error('Ya existe una solicitud activa para esta asignatura.');
    }

    // Insertar la nueva solicitud de permuta
    const insert_solicitud_permuta = {
      text: `insert into solicitud_permuta (usuario_id_fk ,grupo_solicitante_id_fk, estado, id_asignatura_fk, vigente) values ((
              SELECT id FROM usuario WHERE nombre_usuario = $2),
              (SELECT id FROM grupo WHERE habilitado = true AND id in (SELECT grupo_id_fk FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)) AND asignatura_id_fk = 
              (SELECT id FROM asignatura WHERE codigo = $1)),
              'SOLICITADA',
            (Select id from asignatura where codigo = $1), true) returning id`,
      values: [asignatura, uvus],
    };

    const res_solicitud_permuta = await conexion.query(insert_solicitud_permuta);
    const id = res_solicitud_permuta.rows[0].id;

    for (const grupo of grupos_deseados) {
      const insertGrupoDeseado = {
        text: `insert into grupo_deseado (solicitud_permuta_id_fk , grupo_id_fk ) 
                values(
                  $3,
                  (select id from grupo where nombre = $2 and habilitado = true and grupo.asignatura_id_fk = (select id from asignatura where codigo = $1)))`,
        values: [asignatura, grupo, id],
      };
      await conexion.query(insertGrupoDeseado);
    }

    // Obtener datos para el mensaje
    const datosQuery = {
      text: `
            SELECT 
              a.nombre AS asignatura,
              g.nombre AS grupo_solicitante
            FROM solicitud_permuta sp
            INNER JOIN asignatura a ON sp.id_asignatura_fk = a.id
            INNER JOIN grupo g ON sp.grupo_solicitante_id_fk = g.id
            WHERE sp.id = $1
          `,
      values: [id],
    };
    const datosRes = await conexion.query(datosQuery);
    const { asignatura: nombreAsignatura, grupo_solicitante } = datosRes.rows[0];

    // Enviar mensaje por Telegram
    try {
      const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
      await sendMessage(
        chatIdUsuario,
        mensajeSolicitudPermuta(nombreAsignatura, grupo_solicitante, grupos_deseados),
        "HTML"
      );
    } catch (error) {
      console.error("Error al enviar el mensaje de solicitud de permuta:", error);
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

    const asignaturaUsuario = asignaturasUsuario.rows.map(row => parseInt(row.id));
    const query = {
      text: `
      SELECT 
        sp.id AS solicitud_id, 
        sp.estado, 
        g.nombre AS grupo_solicitante, 
        gd.grupo_id_fk AS grupo_deseado_id,
        gd_grupo.nombre AS grupo_deseado,
        a.codigo AS codigo_asignatura,
        a.siglas AS siglas_asignatura
      FROM solicitud_permuta sp
      INNER JOIN grupo_deseado gd ON sp.id = gd.solicitud_permuta_id_fk
      INNER JOIN grupo g ON sp.grupo_solicitante_id_fk = g.id AND g.habilitado = true
      INNER JOIN grupo gd_grupo ON gd.grupo_id_fk = gd_grupo.id AND gd_grupo.habilitado = true
      INNER JOIN asignatura a ON sp.id_asignatura_fk = a.id
      WHERE sp.id_asignatura_fk = ANY($1)
      AND sp.vigente = true
      AND gd.grupo_id_fk IN (
        SELECT ug.grupo_id_fk
        FROM usuario_grupo ug
        INNER JOIN grupo grupo_usuario ON grupo_usuario.id = ug.grupo_id_fk
        WHERE grupo_usuario.habilitado = true
        AND ug.usuario_id_fk = (
          SELECT id FROM usuario WHERE nombre_usuario = $2
        )
      )
      AND sp.usuario_id_fk != (
        SELECT id FROM usuario WHERE nombre_usuario = $2
      )
      AND sp.id NOT IN (
        SELECT solicitud_permuta_id_fk
        FROM permuta
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
      INNER JOIN grupo g_solicitante ON sp.grupo_solicitante_id_fk = g_solicitante.id AND g_solicitante.habilitado = true
      INNER JOIN grupo_deseado gd ON sp.id = gd.solicitud_permuta_id_fk
      INNER JOIN grupo g_deseado ON gd.grupo_id_fk = g_deseado.id AND g_deseado.habilitado = true
      INNER JOIN asignatura a ON sp.id_asignatura_fk = a.id
      WHERE sp.usuario_id_fk = (
        SELECT id FROM usuario WHERE nombre_usuario = $1
      ) and vigente = true
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
      text: ` insert into permuta (solicitud_permuta_id_fk, usuario_id_1_fk, usuario_id_2_fk,asignatura_id_fk, grupo_id_1_fk, grupo_id_2_fk, estado, aceptada_1, aceptada_2) values (
      ($2),
      (select usuario_id_fk from solicitud_permuta where id = $2),
      (select id from usuario where nombre_usuario = $1),  
      (select id_asignatura_fk from solicitud_permuta where id = $2),
      (
        select sp.grupo_solicitante_id_fk
        from solicitud_permuta sp
        inner join grupo g on g.id = sp.grupo_solicitante_id_fk
        where sp.id = $2
          and sp.vigente = true
          and g.habilitado = true
      ),
      (
        select gd.grupo_id_fk
        from grupo_deseado gd
        inner join usuario_grupo ug on ug.grupo_id_fk = gd.grupo_id_fk
        inner join grupo g on g.id = gd.grupo_id_fk
        where gd.solicitud_permuta_id_fk = $2
          and ug.usuario_id_fk = (select id from usuario where nombre_usuario=$1)
          and g.habilitado = true
        limit 1
      ),
	    'ACEPTADA',
      false,
      true)`,
      values: [uvus, solicitud],
    };
    await conexion.query(update);
    await conexion.end();
    return 'Solicitud de permuta aceptada.';
  }

  async actualizarEstadoPermuta(solicitud, uvus) {
    const conexion = await database.connectPostgreSQL();
    const update = {
      text: `UPDATE permuta 
           SET estado = 'VALIDADA', aceptada_1 = true 
           WHERE id = $1 
           AND usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)`,
      values: [solicitud, uvus],
    };
    await conexion.query(update);
    await conexion.end();

    return 'Estado de la permuta actualizado a VALIDADA.';
  }

  async actualizarEstadoSolicitudPermuta(solicitud) {

    const conexion = await database.connectPostgreSQL();
    const updateSolicitud = {
      text: `UPDATE solicitud_permuta 
           SET estado = 'EMPAREJADA' 
           WHERE id = (select solicitud_permuta_id_fk from permuta where id = $1)`,
      values: [solicitud],
    };
    await conexion.query(updateSolicitud);
    await conexion.end();
    return 'Estado de la solicitud de permuta actualizado a EMPAREJADA.';
  }

  async verListaPermutas(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `
      SELECT 
        p.id AS permuta_id,
        -- Ordenar usuarios por nombre_usuario
        LEAST(u1.nombre_usuario, u2.nombre_usuario) AS usuario_1_uvus,
        GREATEST(u1.nombre_usuario, u2.nombre_usuario) AS usuario_2_uvus,
        -- Alinear nombres completos con el orden de nombre_usuario
        CASE 
          WHEN u1.nombre_usuario < u2.nombre_usuario THEN u1.nombre_completo
          ELSE u2.nombre_completo
        END AS usuario_1_nombre,
        CASE 
          WHEN u1.nombre_usuario < u2.nombre_usuario THEN u2.nombre_completo
          ELSE u1.nombre_completo
        END AS usuario_2_nombre,
        e1.siglas AS usuario_1_estudio,
        e2.siglas AS usuario_2_estudio,
        a.nombre AS nombre_asignatura,
        a.codigo AS codigo_asignatura
      FROM permuta p
      INNER JOIN usuario u1 ON p.usuario_id_1_fk = u1.id
      INNER JOIN usuario u2 ON p.usuario_id_2_fk = u2.id
      INNER JOIN estudios e1 ON u1.estudios_id_fk = e1.id
      INNER JOIN estudios e2 ON u2.estudios_id_fk = e2.id
      INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
      WHERE (p.usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
         OR p.usuario_id_2_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)) 
        AND (p.estado = 'VALIDADA' OR p.estado = 'FINALIZADA') and p.vigente = true
      ORDER BY usuario_1_uvus, usuario_2_uvus, p.id
    `,
      values: [uvus],
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
    try {
      await conexion.query('BEGIN');
      await conexion.query("SELECT pg_advisory_xact_lock(hashtext('proponer_permutas_optimas'))");
      const solicitudesRes = await conexion.query(`
        SELECT DISTINCT sp.usuario_id_fk AS estudiante_id,
          sp.id_asignatura_fk AS asignatura,
          sp.grupo_solicitante_id_fk AS grupo_actual,
          gd.grupo_id_fk AS grupo_deseado
        FROM solicitud_permuta sp
        INNER JOIN grupo_deseado gd ON gd.solicitud_permuta_id_fk = sp.id
        INNER JOIN grupo actual ON actual.id = sp.grupo_solicitante_id_fk
        INNER JOIN grupo deseado ON deseado.id = gd.grupo_id_fk
        WHERE sp.estado = 'SOLICITADA' AND sp.vigente = true
          AND actual.habilitado = true AND deseado.habilitado = true
          AND actual.asignatura_id_fk = sp.id_asignatura_fk
          AND deseado.asignatura_id_fk = sp.id_asignatura_fk
          AND NOT EXISTS (
            SELECT 1 FROM permuta p
            WHERE p.vigente = true
              AND p.estado IN ('PROPUESTA', 'ACEPTADA', 'VALIDADA')
              AND p.asignatura_id_fk = sp.id_asignatura_fk
              AND sp.usuario_id_fk IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
          )
      `);

      const emparejamientos = new PermutaMatching(solicitudesRes.rows).construirGrafo().emparejar();
      let propuestasCreadas = 0;
      for (const permuta of emparejamientos) {
        for (const asignatura of permuta.asignaturas) {
          const resultado = await conexion.query({
            text: `INSERT INTO permuta (
              solicitud_permuta_id_fk, usuario_id_1_fk, usuario_id_2_fk,
              asignatura_id_fk, grupo_id_1_fk, grupo_id_2_fk,
              estado, aceptada_1, aceptada_2
            ) SELECT
              sp1.id, $1, $2, $3, sp1.grupo_solicitante_id_fk,
              sp2.grupo_solicitante_id_fk, 'PROPUESTA', false, false
            FROM solicitud_permuta sp1
            INNER JOIN solicitud_permuta sp2
              ON sp2.usuario_id_fk = $2 AND sp2.id_asignatura_fk = $3
              AND sp2.estado = 'SOLICITADA' AND sp2.vigente = true
            INNER JOIN grupo_deseado gd1 ON gd1.solicitud_permuta_id_fk = sp1.id
              AND gd1.grupo_id_fk = sp2.grupo_solicitante_id_fk
            INNER JOIN grupo_deseado gd2 ON gd2.solicitud_permuta_id_fk = sp2.id
              AND gd2.grupo_id_fk = sp1.grupo_solicitante_id_fk
            WHERE sp1.usuario_id_fk = $1 AND sp1.id_asignatura_fk = $3
              AND sp1.estado = 'SOLICITADA' AND sp1.vigente = true
            ORDER BY sp1.id LIMIT 1 RETURNING id`,
            values: [permuta.estudiante1, permuta.estudiante2, asignatura]
          });
          propuestasCreadas += resultado.rowCount;
        }
      }
      await conexion.query('COMMIT');
      return { emparejamientos, propuestasCreadas };
    } catch (error) {
      await conexion.query('ROLLBACK');
      throw error;
    } finally {
      await conexion.end();
    }
  }
  async getPermutasPropuestasSistema(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const resultado = await conexion.query({
        text: `
          SELECT p.id AS permuta_id,
            a.nombre AS nombre_asignatura,
            a.codigo AS codigo_asignatura,
            a.siglas AS siglas_asignatura,
            CASE WHEN p.usuario_id_1_fk = u.id THEN g1.nombre ELSE g2.nombre END AS grupo_actual,
            CASE WHEN p.usuario_id_1_fk = u.id THEN g2.nombre ELSE g1.nombre END AS grupo_destino,
            CASE WHEN p.usuario_id_1_fk = u.id THEN p.aceptada_1 ELSE p.aceptada_2 END AS aceptada_por_mi,
            CASE WHEN p.usuario_id_1_fk = u.id THEN p.aceptada_2 ELSE p.aceptada_1 END AS aceptada_por_otro,
            p.estado
          FROM permuta p
          INNER JOIN usuario u ON u.nombre_usuario = $1
          INNER JOIN asignatura a ON a.id = p.asignatura_id_fk
          INNER JOIN grupo g1 ON g1.id = p.grupo_id_1_fk
          INNER JOIN grupo g2 ON g2.id = p.grupo_id_2_fk
          WHERE u.id IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
            AND p.estado = 'PROPUESTA'
            AND p.vigente = true
          ORDER BY a.nombre, p.id
        `,
        values: [uvus]
      });
      return resultado.rows;
    } finally {
      await conexion.end();
    }
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
        WHERE id = $2 AND estado = 'PROPUESTA' and vigente = true
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
        ) and vigente = true
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

  async getTodasSolicitudesPermuta() {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
        SELECT 
          sp.id AS solicitud_id,
          u.nombre_completo AS usuario_nombre,
          u.nombre_usuario AS usuario_uvus,
          e.siglas AS usuario_estudio,
          a.nombre AS asignatura_nombre,
          a.codigo AS asignatura_codigo,
          g_solicitante.nombre AS grupo_solicitante,
          g_deseado.nombre AS grupo_deseado
        FROM solicitud_permuta sp
        INNER JOIN usuario u ON sp.usuario_id_fk = u.id
        INNER JOIN estudios e ON u.estudios_id_fk = e.id
        INNER JOIN asignatura a ON sp.id_asignatura_fk = a.id
        INNER JOIN grupo g_solicitante ON sp.grupo_solicitante_id_fk = g_solicitante.id
        INNER JOIN grupo_deseado gd ON sp.id = gd.solicitud_permuta_id_fk
        INNER JOIN grupo g_deseado ON gd.grupo_id_fk = g_deseado.id
        ORDER BY sp.id, g_deseado.nombre
      `,
      };

      const res = await conexion.query(query);

      // Agrupar las solicitudes por solicitud_id
      const solicitudesAgrupadas = res.rows.reduce((acc, row) => {
        const solicitudExistente = acc.find(s => s.solicitud_id === row.solicitud_id);

        if (solicitudExistente) {
          solicitudExistente.grupos_deseados.push(row.grupo_deseado);
        } else {
          acc.push({
            solicitud_id: row.solicitud_id,
            usuario: {
              nombre_completo: row.usuario_nombre,
              uvus: row.usuario_uvus,
              estudio: row.usuario_estudio,
            },
            asignatura: {
              nombre: row.asignatura_nombre,
              codigo: row.asignatura_codigo,
            },
            grupo_solicitante: row.grupo_solicitante,
            grupos_deseados: [row.grupo_deseado],
          });
        }

        return acc;
      }, []);

      await conexion.end();
      return solicitudesAgrupadas;
    } catch (error) {
      await conexion.end();
      throw new Error('Error al obtener las solicitudes de permuta: ' + error.message);
    }
  }

  async cancelarSolicitudPermuta(uvus, solicitudId, esAdmin = false) {
    const conexion = await database.connectPostgreSQL();
    try {
      // Verifica si el usuario es el creador o es admin
      const query = {
        text: `
        SELECT usuario_id_fk FROM solicitud_permuta WHERE id = $1
      `,
        values: [solicitudId],
      };
      const res = await conexion.query(query);
      if (res.rows.length === 0) {
        throw new Error("Solicitud de permuta no encontrada");
      }
      const usuarioCreadorId = res.rows[0].usuario_id_fk;

      if (!esAdmin) {
        const queryUsuario = {
          text: `SELECT id FROM usuario WHERE nombre_usuario = $1`,
          values: [uvus],
        };
        const resUsuario = await conexion.query(queryUsuario);
        if (resUsuario.rows.length === 0 || resUsuario.rows[0].id !== usuarioCreadorId) {
          throw new Error("No tienes permisos para cancelar esta solicitud");
        }
      }

      // Cancela la solicitud
      await conexion.query({
        text: `UPDATE solicitud_permuta SET estado = 'CANCELADA' WHERE id = $1`,
        values: [solicitudId],
      });

      await conexion.end();
      return "Solicitud de permuta cancelada correctamente";
    } catch (error) {
      await conexion.end();
      throw error;

    }
  }
  async actualizarLaVigenciaSolicitud() {
    const conexion = await database.connectPostgreSQL();
    try {
      const updateQuery = {
        text: `UPDATE solicitud_permuta SET vigente = false WHERE vigente = true`,
      };
      const res = await conexion.query(updateQuery);
      return { updated: res.rowCount };
    } catch (error) {
      console.error("Error al actualizar la vigencia de las solicitudes:", error);
      throw new Error("Error al actualizar la vigencia de las solicitudes");
    } finally {
      await conexion.end();
    }
  }
}

const solicitudPermutaService = new SolicitudPermutaService();
export default solicitudPermutaService
