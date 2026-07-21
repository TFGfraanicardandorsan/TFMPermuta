import database from "../config/database.mjs";
import PermutaMatching from "../algorithm/AlgoritmoCruzadoSolicitudes.mjs";
import { mensajeSolicitudPermuta } from "../utils/mensajesTelegram.mjs";
import { sendMessage } from "./telegramService.mjs";
import autorizacionService from "./autorizacionService.mjs";

const BLOQUEO_PROPUESTAS_PERMUTA = "SELECT pg_advisory_xact_lock(hashtext('proponer_permutas_optimas'))";
const ESTADOS_PERMUTA_ACTIVA = ['PROPUESTA', 'ACEPTADA', 'VALIDADA', 'FINALIZADA'];
const MAX_INT_POSTGRES = 2_147_483_647;
const MAX_GRUPOS_DESEADOS = 100;

const crearErrorSolicitud = (statusCode, message, detalles = undefined) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (detalles !== undefined) {
    error.detalles = detalles;
  }
  return error;
};

class SolicitudPermutaService {
  async solicitarPermuta(uvus, asignatura, grupos_deseados) {
    if (
      !Array.isArray(grupos_deseados)
      || grupos_deseados.length === 0
      || grupos_deseados.length > MAX_GRUPOS_DESEADOS
      || grupos_deseados.some((grupo) => (
        !Number.isSafeInteger(grupo) || grupo <= 0 || grupo > MAX_INT_POSTGRES
      ))
    ) {
      throw crearErrorSolicitud(400, 'Debe indicarse al menos un grupo deseado válido.');
    }
    const gruposSolicitados = [...new Set(
      grupos_deseados.map((grupo) => String(grupo))
    )];

    const conexion = await database.connectPostgreSQL();
    let transaccionIniciada = false;
    let datosSolicitud;
    try {
      await conexion.query('BEGIN');
      transaccionIniciada = true;
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);

      const contextoRes = await conexion.query({
        text: `
          SELECT
            u.id AS usuario_id,
            a.id AS asignatura_id,
            a.nombre AS asignatura,
            g.id AS grupo_solicitante_id,
            g.nombre AS grupo_solicitante
          FROM usuario u
          INNER JOIN asignatura a ON a.codigo = $2
          INNER JOIN usuario_grupo ug ON ug.usuario_id_fk = u.id
          INNER JOIN grupo g ON g.id = ug.grupo_id_fk
            AND g.asignatura_id_fk = a.id
            AND g.habilitado = true
          WHERE u.nombre_usuario = $1
          ORDER BY g.id
          LIMIT 1
          FOR SHARE OF g
        `,
        values: [uvus, asignatura],
      });

      if (contextoRes.rows.length === 0) {
        throw crearErrorSolicitud(
          400,
          'No existe una asignatura y un grupo actual habilitado para el usuario.'
        );
      }

      const contexto = contextoRes.rows[0];
      const solicitudExistenteRes = await conexion.query({
        text: `
          SELECT 1
          FROM solicitud_permuta
          WHERE usuario_id_fk = $1
            AND id_asignatura_fk = $2
            AND estado = 'SOLICITADA'
            AND vigente = true
          LIMIT 1
          FOR UPDATE
        `,
        values: [contexto.usuario_id, contexto.asignatura_id],
      });

      if (solicitudExistenteRes.rows.length > 0) {
        throw crearErrorSolicitud(409, 'Ya existe una solicitud activa para esta asignatura.');
      }

      const permutaActivaRes = await conexion.query({
        text: `
          SELECT 1
          FROM permuta p
          WHERE p.vigente = true
            AND p.estado = ANY($3::text[])
            AND p.asignatura_id_fk = $1
            AND $2 IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
          LIMIT 1
        `,
        values: [contexto.asignatura_id, contexto.usuario_id, ESTADOS_PERMUTA_ACTIVA],
      });
      if (permutaActivaRes.rows.length > 0) {
        throw crearErrorSolicitud(409, 'El usuario ya tiene una permuta activa para esta asignatura.');
      }

      const gruposValidosRes = await conexion.query({
        text: `
          SELECT id, nombre
          FROM grupo
          WHERE asignatura_id_fk = $1
            AND habilitado = true
            AND id <> $2
            AND nombre = ANY($3::text[])
          ORDER BY CAST(nombre AS INTEGER), id
          FOR SHARE
        `,
        values: [contexto.asignatura_id, contexto.grupo_solicitante_id, gruposSolicitados],
      });

      if (gruposValidosRes.rows.length !== gruposSolicitados.length) {
        throw crearErrorSolicitud(
          400,
          'Uno o más grupos deseados no existen, no están habilitados o no pertenecen a la asignatura.'
        );
      }

      const solicitudRes = await conexion.query({
        text: `
          INSERT INTO solicitud_permuta (
            usuario_id_fk, grupo_solicitante_id_fk, estado, id_asignatura_fk, vigente
          ) VALUES ($1, $2, 'SOLICITADA', $3, true)
          RETURNING id
        `,
        values: [contexto.usuario_id, contexto.grupo_solicitante_id, contexto.asignatura_id],
      });
      const solicitudId = solicitudRes.rows[0].id;
      const gruposIds = gruposValidosRes.rows.map((grupo) => grupo.id);

      await conexion.query({
        text: `
          INSERT INTO grupo_deseado (solicitud_permuta_id_fk, grupo_id_fk)
          SELECT $1, grupo_id
          FROM unnest($2::int[]) AS grupo_id
        `,
        values: [solicitudId, gruposIds],
      });

      await conexion.query('COMMIT');
      transaccionIniciada = false;
      datosSolicitud = {
        nombreAsignatura: contexto.asignatura,
        grupoSolicitante: contexto.grupo_solicitante,
        gruposDeseados: gruposValidosRes.rows.map((grupo) => grupo.nombre),
      };
    } catch (error) {
      if (transaccionIniciada) {
        try {
          await conexion.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error al deshacer la creación de la solicitud de permuta:', rollbackError);
        }
      }
      throw error;
    } finally {
      await conexion.end();
    }

    // Enviar mensaje por Telegram
    try {
      const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
      await sendMessage(
        chatIdUsuario,
        mensajeSolicitudPermuta(
          datosSolicitud.nombreAsignatura,
          datosSolicitud.grupoSolicitante,
          datosSolicitud.gruposDeseados
        ),
        "HTML"
      );
    } catch (error) {
      console.error("Error al enviar el mensaje de solicitud de permuta:", error);
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
      AND sp.estado = 'SOLICITADA'
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
      AND NOT EXISTS (
        SELECT 1
        FROM permuta p
        WHERE p.vigente = true
          AND p.estado = ANY($3::text[])
          AND p.asignatura_id_fk = sp.id_asignatura_fk
          AND sp.usuario_id_fk IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
      )
    `,
      values: [asignaturaUsuario, uvus, ESTADOS_PERMUTA_ACTIVA],
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
        g_deseado.id AS grupo_deseado_id,
        g_deseado.nombre AS grupo_deseado,
        a.codigo AS codigo_asignatura, 
        a.nombre AS nombre_asignatura,
        (
          sp.estado = 'SOLICITADA'
          AND sp.vigente = true
          AND NOT EXISTS (
            SELECT 1
            FROM permuta p
            WHERE p.vigente = true
              AND p.estado = ANY($2::text[])
              AND p.asignatura_id_fk = sp.id_asignatura_fk
              AND sp.usuario_id_fk IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
          )
        ) AS editable
      FROM solicitud_permuta sp
      INNER JOIN grupo g_solicitante ON sp.grupo_solicitante_id_fk = g_solicitante.id AND g_solicitante.habilitado = true
      INNER JOIN grupo_deseado gd ON sp.id = gd.solicitud_permuta_id_fk
      INNER JOIN grupo g_deseado ON gd.grupo_id_fk = g_deseado.id AND g_deseado.habilitado = true
      INNER JOIN asignatura a ON sp.id_asignatura_fk = a.id
      WHERE sp.usuario_id_fk = (
        SELECT id FROM usuario WHERE nombre_usuario = $1
      ) AND sp.vigente = true
      ORDER BY sp.id, g_deseado.nombre
    `,
      values: [uvus, ESTADOS_PERMUTA_ACTIVA],
    };

    const res = await conexion.query(query);

    // Agrupar los resultados por solicitud
    const solicitudesAgrupadas = res.rows.reduce((acc, row) => {
      const solicitudExistente = acc.find(s => s.solicitud_id === row.solicitud_id);

      if (solicitudExistente) {
        solicitudExistente.grupos_deseados.push(row.grupo_deseado);
        solicitudExistente.grupos_deseados_ids.push(row.grupo_deseado_id);
      } else {
        acc.push({
          solicitud_id: row.solicitud_id,
          estado: row.estado,
          grupo_solicitante: row.grupo_solicitante,
          grupos_deseados: [row.grupo_deseado],
          grupos_deseados_ids: [row.grupo_deseado_id],
          codigo_asignatura: row.codigo_asignatura,
          nombre_asignatura: row.nombre_asignatura,
          editable: row.editable,
        });
      }

      return acc;
    }, []);

    await conexion.end();
    return solicitudesAgrupadas;
  }

  async editarGruposDeseados(uvus, solicitudId, gruposDeseadosIds) {
    if (
      !Array.isArray(gruposDeseadosIds)
      || gruposDeseadosIds.length === 0
      || gruposDeseadosIds.length > MAX_GRUPOS_DESEADOS
      || gruposDeseadosIds.some((grupoId) => (
        !Number.isSafeInteger(grupoId) || grupoId <= 0 || grupoId > MAX_INT_POSTGRES
      ))
    ) {
      throw crearErrorSolicitud(400, 'Debe indicarse al menos un identificador de grupo válido.');
    }

    const gruposSolicitados = [...new Set(gruposDeseadosIds)];
    const conexion = await database.connectPostgreSQL();
    let transaccionIniciada = false;
    try {
      await conexion.query('BEGIN');
      transaccionIniciada = true;
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);

      const solicitudInicialRes = await conexion.query({
        text: `
          SELECT
            sp.id,
            sp.usuario_id_fk,
            sp.id_asignatura_fk,
            sp.grupo_solicitante_id_fk,
            sp.estado,
            sp.vigente
          FROM solicitud_permuta sp
          INNER JOIN usuario u ON u.id = sp.usuario_id_fk
          WHERE sp.id = $1
            AND u.nombre_usuario = $2
        `,
        values: [solicitudId, uvus],
      });

      if (solicitudInicialRes.rows.length === 0) {
        throw crearErrorSolicitud(404, 'La solicitud no existe o no pertenece al usuario autenticado.');
      }

      const solicitudInicial = solicitudInicialRes.rows[0];
      const idsGruposABloquear = [
        ...new Set([solicitudInicial.grupo_solicitante_id_fk, ...gruposSolicitados]),
      ].sort((a, b) => a - b);
      const gruposBloqueadosRes = await conexion.query({
        text: `
          SELECT id, nombre, asignatura_id_fk, habilitado
          FROM grupo
          WHERE id = ANY($1::int[])
          ORDER BY id
          FOR SHARE
        `,
        values: [idsGruposABloquear],
      });

      const solicitudBloqueadaRes = await conexion.query({
        text: `
          SELECT
            sp.id,
            sp.usuario_id_fk,
            sp.id_asignatura_fk,
            sp.grupo_solicitante_id_fk,
            sp.estado,
            sp.vigente
          FROM solicitud_permuta sp
          INNER JOIN usuario u ON u.id = sp.usuario_id_fk
          WHERE sp.id = $1
            AND u.nombre_usuario = $2
          FOR UPDATE OF sp
        `,
        values: [solicitudId, uvus],
      });
      if (solicitudBloqueadaRes.rows.length === 0) {
        throw crearErrorSolicitud(404, 'La solicitud no existe o no pertenece al usuario autenticado.');
      }

      const solicitud = solicitudBloqueadaRes.rows[0];
      if (solicitud.estado !== 'SOLICITADA' || solicitud.vigente !== true) {
        throw crearErrorSolicitud(409, 'La solicitud ya no se encuentra en un estado editable.');
      }
      if (
        solicitud.id_asignatura_fk !== solicitudInicial.id_asignatura_fk
        || solicitud.grupo_solicitante_id_fk !== solicitudInicial.grupo_solicitante_id_fk
      ) {
        throw crearErrorSolicitud(409, 'La solicitud cambió mientras se estaba editando.');
      }

      const gruposPorIdBloqueados = new Map(
        gruposBloqueadosRes.rows.map((grupo) => [grupo.id, grupo])
      );
      const grupoSolicitante = gruposPorIdBloqueados.get(solicitud.grupo_solicitante_id_fk);
      if (
        !grupoSolicitante
        || grupoSolicitante.habilitado !== true
        || grupoSolicitante.asignatura_id_fk !== solicitud.id_asignatura_fk
      ) {
        throw crearErrorSolicitud(409, 'El grupo actual de la solicitud ya no está disponible.');
      }

      const permutaActivaRes = await conexion.query({
        text: `
          SELECT 1
          FROM permuta p
          WHERE p.vigente = true
            AND p.estado = ANY($3::text[])
            AND p.asignatura_id_fk = $1
            AND $2 IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
          LIMIT 1
        `,
        values: [solicitud.id_asignatura_fk, solicitud.usuario_id_fk, ESTADOS_PERMUTA_ACTIVA],
      });
      if (permutaActivaRes.rows.length > 0) {
        throw crearErrorSolicitud(
          409,
          'La solicitud no puede editarse porque ya tiene una permuta activa para la asignatura.'
        );
      }

      const gruposValidos = gruposSolicitados
        .map((grupoId) => gruposPorIdBloqueados.get(grupoId))
        .filter((grupo) => (
          grupo
          && grupo.habilitado === true
          && grupo.asignatura_id_fk === solicitud.id_asignatura_fk
          && grupo.id !== solicitud.grupo_solicitante_id_fk
        ));
      if (gruposValidos.length !== gruposSolicitados.length) {
        const idsValidos = new Set(gruposValidos.map((grupo) => grupo.id));
        const idsInvalidos = gruposSolicitados.filter((grupoId) => !idsValidos.has(grupoId));
        throw crearErrorSolicitud(
          400,
          'Uno o más grupos no existen, no están habilitados o no pertenecen a la asignatura.',
          { gruposInvalidos: idsInvalidos }
        );
      }

      const gruposActualesRes = await conexion.query({
        text: `
          SELECT grupo_id_fk
          FROM grupo_deseado
          WHERE solicitud_permuta_id_fk = $1
          FOR UPDATE
        `,
        values: [solicitudId],
      });
      const gruposActuales = [...new Set(gruposActualesRes.rows.map((row) => row.grupo_id_fk))];
      const gruposActualesSet = new Set(gruposActuales);
      const gruposSolicitadosSet = new Set(gruposSolicitados);
      const gruposAInsertar = gruposSolicitados.filter((grupoId) => !gruposActualesSet.has(grupoId));
      const gruposAEliminar = gruposActuales.filter((grupoId) => !gruposSolicitadosSet.has(grupoId));

      if (gruposAEliminar.length > 0) {
        await conexion.query({
          text: `
            DELETE FROM grupo_deseado
            WHERE solicitud_permuta_id_fk = $1
              AND grupo_id_fk = ANY($2::int[])
          `,
          values: [solicitudId, gruposAEliminar],
        });
      }
      if (gruposAInsertar.length > 0) {
        await conexion.query({
          text: `
            INSERT INTO grupo_deseado (solicitud_permuta_id_fk, grupo_id_fk)
            SELECT $1, grupo_id
            FROM unnest($2::int[]) AS grupo_id
          `,
          values: [solicitudId, gruposAInsertar],
        });
      }

      await conexion.query('COMMIT');
      transaccionIniciada = false;

      const gruposPorId = new Map(gruposValidos.map((grupo) => [grupo.id, grupo.nombre]));
      return {
        solicitud_id: solicitudId,
        grupos_deseados: gruposSolicitados.map((grupoId) => gruposPorId.get(grupoId)),
        grupos_deseados_ids: gruposSolicitados,
        cambios: {
          insertados: gruposAInsertar,
          eliminados: gruposAEliminar,
        },
      };
    } catch (error) {
      if (transaccionIniciada) {
        try {
          await conexion.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error al deshacer la edición de grupos deseados:', rollbackError);
        }
      }
      throw error;
    } finally {
      await conexion.end();
    }
  }

  async aceptarSolicitudPermuta(uvus, solicitud) {
    const conexion = await database.connectPostgreSQL();
    let transaccionIniciada = false;
    try {
      await conexion.query('BEGIN');
      transaccionIniciada = true;
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);

      const solicitudInicialRes = await conexion.query({
        text: `
          SELECT
            sp.id,
            sp.usuario_id_fk,
            sp.id_asignatura_fk,
            sp.grupo_solicitante_id_fk
          FROM solicitud_permuta sp
          WHERE sp.id = $1
            AND sp.estado = 'SOLICITADA'
            AND sp.vigente = true
        `,
        values: [solicitud],
      });
      if (solicitudInicialRes.rows.length === 0) {
        throw crearErrorSolicitud(409, 'La solicitud no existe o ya no puede aceptarse.');
      }

      const solicitudInicial = solicitudInicialRes.rows[0];
      const usuarioAceptanteRes = await conexion.query({
        text: `
          SELECT u.id AS usuario_id, g.id AS grupo_id
          FROM usuario u
          INNER JOIN usuario_grupo ug ON ug.usuario_id_fk = u.id
          INNER JOIN grupo g ON g.id = ug.grupo_id_fk
            AND g.habilitado = true
            AND g.asignatura_id_fk = $2
          INNER JOIN grupo_deseado gd ON gd.grupo_id_fk = g.id
            AND gd.solicitud_permuta_id_fk = $3
          WHERE u.nombre_usuario = $1
            AND u.id <> $4
          ORDER BY g.id
          LIMIT 1
          FOR SHARE OF g
        `,
        values: [
          uvus,
          solicitudInicial.id_asignatura_fk,
          solicitudInicial.id,
          solicitudInicial.usuario_id_fk,
        ],
      });
      if (usuarioAceptanteRes.rows.length === 0) {
        throw crearErrorSolicitud(403, 'El usuario no puede aceptar esta solicitud de permuta.');
      }

      const usuarioAceptante = usuarioAceptanteRes.rows[0];
      const grupoSolicitanteRes = await conexion.query({
        text: `
          SELECT id
          FROM grupo
          WHERE id = $1
            AND asignatura_id_fk = $2
            AND habilitado = true
          FOR SHARE
        `,
        values: [solicitudInicial.grupo_solicitante_id_fk, solicitudInicial.id_asignatura_fk],
      });
      if (grupoSolicitanteRes.rows.length === 0) {
        throw crearErrorSolicitud(409, 'El grupo actual de la solicitud ya no está disponible.');
      }

      const solicitudBloqueadaRes = await conexion.query({
        text: `
          SELECT id, usuario_id_fk, id_asignatura_fk, grupo_solicitante_id_fk
          FROM solicitud_permuta
          WHERE id = $1
            AND estado = 'SOLICITADA'
            AND vigente = true
          FOR UPDATE
        `,
        values: [solicitud],
      });
      if (solicitudBloqueadaRes.rows.length === 0) {
        throw crearErrorSolicitud(409, 'La solicitud ya no puede aceptarse.');
      }
      const solicitudEncontrada = solicitudBloqueadaRes.rows[0];
      if (
        solicitudEncontrada.usuario_id_fk !== solicitudInicial.usuario_id_fk
        || solicitudEncontrada.id_asignatura_fk !== solicitudInicial.id_asignatura_fk
        || solicitudEncontrada.grupo_solicitante_id_fk !== solicitudInicial.grupo_solicitante_id_fk
      ) {
        throw crearErrorSolicitud(409, 'La solicitud cambió mientras se estaba aceptando.');
      }

      const permutaActivaRes = await conexion.query({
        text: `
          SELECT 1
          FROM permuta p
          WHERE p.vigente = true
            AND p.estado = ANY($4::text[])
            AND p.asignatura_id_fk = $1
            AND (
              $2 IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
              OR $3 IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
            )
          LIMIT 1
        `,
        values: [
          solicitudEncontrada.id_asignatura_fk,
          solicitudEncontrada.usuario_id_fk,
          usuarioAceptante.usuario_id,
          ESTADOS_PERMUTA_ACTIVA,
        ],
      });
      if (permutaActivaRes.rows.length > 0) {
        throw crearErrorSolicitud(409, 'Alguno de los usuarios ya tiene una permuta activa para la asignatura.');
      }

      await conexion.query({
        text: `
          INSERT INTO permuta (
            solicitud_permuta_id_fk, usuario_id_1_fk, usuario_id_2_fk,
            asignatura_id_fk, grupo_id_1_fk, grupo_id_2_fk,
            estado, aceptada_1, aceptada_2
          ) VALUES ($1, $2, $3, $4, $5, $6, 'ACEPTADA', false, true)
        `,
        values: [
          solicitudEncontrada.id,
          solicitudEncontrada.usuario_id_fk,
          usuarioAceptante.usuario_id,
          solicitudEncontrada.id_asignatura_fk,
          solicitudEncontrada.grupo_solicitante_id_fk,
          usuarioAceptante.grupo_id,
        ],
      });

      await conexion.query('COMMIT');
      transaccionIniciada = false;
      return 'Solicitud de permuta aceptada.';
    } catch (error) {
      if (transaccionIniciada) {
        try {
          await conexion.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error al deshacer la aceptación de la solicitud:', rollbackError);
        }
      }
      throw error;
    } finally {
      await conexion.end();
    }
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
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);
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
    let transaccionIniciada = false;
    try {
      await conexion.query('BEGIN');
      transaccionIniciada = true;
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);

      const solicitudRes = await conexion.query({
        text: `
          SELECT
            sp.usuario_id_fk,
            sp.id_asignatura_fk,
            sp.estado,
            sp.vigente,
            u.nombre_usuario
          FROM solicitud_permuta sp
          INNER JOIN usuario u ON u.id = sp.usuario_id_fk
          WHERE sp.id = $1
          FOR UPDATE OF sp
        `,
        values: [solicitudId],
      });
      if (solicitudRes.rows.length === 0) {
        throw crearErrorSolicitud(404, 'Solicitud de permuta no encontrada.');
      }

      const solicitud = solicitudRes.rows[0];
      if (!esAdmin && solicitud.nombre_usuario !== uvus) {
        throw crearErrorSolicitud(403, 'No tienes permisos para cancelar esta solicitud.');
      }
      if (solicitud.estado !== 'SOLICITADA' || solicitud.vigente !== true) {
        throw crearErrorSolicitud(409, 'La solicitud ya no se encuentra en un estado cancelable.');
      }

      const permutaActivaRes = await conexion.query({
        text: `
          SELECT 1
          FROM permuta p
          WHERE p.vigente = true
            AND p.estado = ANY($3::text[])
            AND p.asignatura_id_fk = $1
            AND $2 IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
          LIMIT 1
        `,
        values: [solicitud.id_asignatura_fk, solicitud.usuario_id_fk, ESTADOS_PERMUTA_ACTIVA],
      });
      if (permutaActivaRes.rows.length > 0) {
        throw crearErrorSolicitud(409, 'La solicitud no puede cancelarse porque ya tiene una permuta activa.');
      }

      await conexion.query({
        text: `UPDATE solicitud_permuta SET estado = 'CANCELADA' WHERE id = $1`,
        values: [solicitudId],
      });

      await conexion.query('COMMIT');
      transaccionIniciada = false;
      return 'Solicitud de permuta cancelada correctamente';
    } catch (error) {
      if (transaccionIniciada) {
        try {
          await conexion.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error al deshacer la cancelación de la solicitud:', rollbackError);
        }
      }
      throw error;
    } finally {
      await conexion.end();
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
