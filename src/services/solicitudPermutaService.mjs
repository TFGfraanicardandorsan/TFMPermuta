import { randomUUID } from 'node:crypto';
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

const validarGruposDeseados = (grupos_deseados) => {
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
};

class SolicitudPermutaService {
  async crearSolicitudEnTransaccion(conexion, uvus, asignatura, grupos_deseados, bloqueId = null) {
    validarGruposDeseados(grupos_deseados);
    const gruposSolicitados = [...new Set(grupos_deseados)];

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
          AND CAST(nombre AS INTEGER) = ANY($3::int[])
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
          usuario_id_fk, grupo_solicitante_id_fk, estado, id_asignatura_fk, vigente, bloque_id
        ) VALUES ($1, $2, 'SOLICITADA', $3, true, $4)
        RETURNING id
      `,
      values: [contexto.usuario_id, contexto.grupo_solicitante_id, contexto.asignatura_id, bloqueId],
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

    return {
      solicitud_id: solicitudId,
      nombreAsignatura: contexto.asignatura,
      grupoSolicitante: contexto.grupo_solicitante,
      gruposDeseados: gruposValidosRes.rows.map(grupo => grupo.nombre),
    };
  }

  async notificarSolicitud(uvus, datos) {
    try {
      const chatId = await autorizacionService.obtenerChatIdUsuario(uvus);
      await sendMessage(chatId, mensajeSolicitudPermuta(
        datos.nombreAsignatura, datos.grupoSolicitante, datos.gruposDeseados
      ), 'HTML');
    } catch (error) {
      console.error('Error al notificar la solicitud de permuta:', error);
    }
  }

  async solicitarPermuta(uvus, asignatura, grupos_deseados) {
    // Validar antes de abrir la conexión, también para consumidores del servicio.
    validarGruposDeseados(grupos_deseados);

    const conexion = await database.connectPostgreSQL();
    let datos;
    try {
      await conexion.query('BEGIN');
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);
      datos = await this.crearSolicitudEnTransaccion(conexion, uvus, asignatura, grupos_deseados);
      await conexion.query('COMMIT');
    } catch (error) {
      await conexion.query('ROLLBACK');
      throw error;
    } finally {
      await conexion.end();
    }
    await this.notificarSolicitud(uvus, datos);
    return 'Permuta de la asignatura solicitada.';
  }

  async getCursosPermuta(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const { rows } = await conexion.query({
        text: `SELECT DISTINCT a.curso, a.codigo AS codigo_asignatura, a.nombre AS nombre_asignatura
          FROM usuario_asignatura ua
          JOIN usuario u ON u.id = ua.usuario_id_fk
          JOIN asignatura a ON a.id = ua.asignatura_id_fk
          WHERE u.nombre_usuario = $1 ORDER BY a.curso, a.codigo`,
        values: [uvus],
      });
      const cursos = new Map();
      for (const { curso, ...asignatura } of rows) {
        if (!cursos.has(curso)) cursos.set(curso, { curso, asignaturas: [] });
        cursos.get(curso).asignaturas.push(asignatura);
      }
      return [...cursos.values()];
    } finally {
      await conexion.end();
    }
  }

  async solicitarPermutaCurso(uvus, { curso, en_bloque, solicitudes } = {}) {
    if (!['PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO'].includes(curso)
      || typeof en_bloque !== 'boolean'
      || !Array.isArray(solicitudes) || !solicitudes.length || solicitudes.length > 100
      || solicitudes.some(s => !s || !Number.isSafeInteger(s.asignatura)
        || s.asignatura <= 0 || s.asignatura > MAX_INT_POSTGRES)
      || new Set(solicitudes.map(s => s.asignatura)).size !== solicitudes.length) {
      throw crearErrorSolicitud(400, 'Indica curso, en_bloque booleano y solicitudes sin asignaturas duplicadas.');
    }
    const conexion = await database.connectPostgreSQL();
    const bloqueId = en_bloque ? randomUUID() : null;
    const creadas = [];
    try {
      await conexion.query('BEGIN');
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);
      const matricula = await conexion.query({
        text: `SELECT a.codigo FROM usuario_asignatura ua
          JOIN usuario u ON u.id = ua.usuario_id_fk
          JOIN asignatura a ON a.id = ua.asignatura_id_fk
          WHERE u.nombre_usuario = $1 AND a.curso::text = $2::text
          FOR SHARE OF ua, a`,
        values: [uvus, curso],
      });
      const codigos = new Set(matricula.rows.map(a => Number(a.codigo)));
      if (!codigos.size || solicitudes.some(s => !codigos.has(s.asignatura))
        || (en_bloque && solicitudes.length !== codigos.size)) {
        throw crearErrorSolicitud(400,
          'Las asignaturas deben estar matriculadas en el curso; el bloque debe incluirlas todas.',
          { asignaturas_requeridas: [...codigos] });
      }
      for (const solicitud of solicitudes) {
        creadas.push(await this.crearSolicitudEnTransaccion(
          conexion, uvus, solicitud.asignatura, solicitud.grupos_deseados, bloqueId
        ));
      }
      await conexion.query('COMMIT');
    } catch (error) {
      await conexion.query('ROLLBACK');
      throw error;
    } finally {
      await conexion.end();
    }
    for (const datos of creadas) await this.notificarSolicitud(uvus, datos);
    return { curso, en_bloque, bloque_id: bloqueId, solicitudes_ids: creadas.map(s => s.solicitud_id) };
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
        a.curso, sp.bloque_id, (sp.bloque_id IS NOT NULL) AS en_bloque,
        (sp.bloque_id IS NULL AND NOT EXISTS (
          SELECT 1 FROM solicitud_permuta propia
          JOIN usuario interesado ON interesado.id = propia.usuario_id_fk
          WHERE interesado.nombre_usuario = $2 AND propia.id_asignatura_fk = sp.id_asignatura_fk
            AND propia.bloque_id IS NOT NULL AND propia.estado = 'SOLICITADA' AND propia.vigente = true
        )) AS aceptable_individual,
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
        a.curso, sp.bloque_id, (sp.bloque_id IS NOT NULL) AS en_bloque,
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
          curso: row.curso,
          bloque_id: row.bloque_id ?? null,
          en_bloque: row.en_bloque === true,
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
            sp.grupo_solicitante_id_fk, sp.bloque_id
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
      if (solicitudInicial.bloque_id) {
        throw crearErrorSolicitud(409, 'Esta solicitud se gestiona en bloque desde las propuestas del sistema.');
      }
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
      const bloqueAceptante = await conexion.query({
        text: `SELECT 1 FROM solicitud_permuta sp WHERE sp.usuario_id_fk = $1
          AND sp.id_asignatura_fk = $2 AND sp.bloque_id IS NOT NULL
          AND sp.estado = 'SOLICITADA' AND sp.vigente = true`,
        values: [usuarioAceptante.usuario_id, solicitudInicial.id_asignatura_fk],
      });
      if (bloqueAceptante.rows.length) {
        throw crearErrorSolicitud(409, 'Tu solicitud se gestiona en bloque desde las propuestas del sistema.');
      }
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
    try {
      const resultado = await conexion.query({
        text: `UPDATE permuta SET estado = 'VALIDADA', aceptada_1 = true
          WHERE id = $1 AND bloque_id IS NULL AND estado = 'ACEPTADA'
            AND vigente = true AND aceptada_2 = true
            AND usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)`,
        values: [solicitud, uvus],
      });
      if (!resultado.rowCount) {
        throw crearErrorSolicitud(409, 'La permuta no está disponible. Los bloques se responden desde propuestas del sistema.');
      }
      return 'Estado de la permuta actualizado a VALIDADA.';
    } finally {
      await conexion.end();
    }
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
        documento.id AS documento_permuta_id,
        -- Si ya existe documento, respetar quién inició su cumplimentación.
        COALESCE(
          documento.estudiante_cumplimentado_1,
          $1
        ) AS usuario_1_uvus,
        CASE
          WHEN documento.estudiante_cumplimentado_1 = u1.nombre_usuario
            THEN u2.nombre_usuario
          WHEN documento.estudiante_cumplimentado_1 = u2.nombre_usuario
            THEN u1.nombre_usuario
          WHEN u1.nombre_usuario = $1
            THEN u2.nombre_usuario
          ELSE u1.nombre_usuario
        END AS usuario_2_uvus,
        CASE
          WHEN documento.estudiante_cumplimentado_1 = u1.nombre_usuario
            THEN u1.nombre_completo
          WHEN documento.estudiante_cumplimentado_1 = u2.nombre_usuario
            THEN u2.nombre_completo
          WHEN u1.nombre_usuario = $1
            THEN u1.nombre_completo
          ELSE u2.nombre_completo
        END AS usuario_1_nombre,
        CASE
          WHEN documento.estudiante_cumplimentado_1 = u1.nombre_usuario
            THEN u2.nombre_completo
          WHEN documento.estudiante_cumplimentado_1 = u2.nombre_usuario
            THEN u1.nombre_completo
          WHEN u1.nombre_usuario = $1
            THEN u2.nombre_completo
          ELSE u1.nombre_completo
        END AS usuario_2_nombre,
        CASE
          WHEN documento.estudiante_cumplimentado_1 = u1.nombre_usuario
            THEN e1.siglas
          WHEN documento.estudiante_cumplimentado_1 = u2.nombre_usuario
            THEN e2.siglas
          WHEN u1.nombre_usuario = $1
            THEN e1.siglas
          ELSE e2.siglas
        END AS usuario_1_estudio,
        CASE
          WHEN documento.estudiante_cumplimentado_1 = u1.nombre_usuario
            THEN e2.siglas
          WHEN documento.estudiante_cumplimentado_1 = u2.nombre_usuario
            THEN e1.siglas
          WHEN u1.nombre_usuario = $1
            THEN e2.siglas
          ELSE e1.siglas
        END AS usuario_2_estudio,
        a.nombre AS nombre_asignatura,
        a.codigo AS codigo_asignatura
      FROM permuta p
      INNER JOIN usuario u1 ON p.usuario_id_1_fk = u1.id
      INNER JOIN usuario u2 ON p.usuario_id_2_fk = u2.id
      INNER JOIN estudios e1 ON u1.estudios_id_fk = e1.id
      INNER JOIN estudios e2 ON u2.estudios_id_fk = e2.id
      INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
      LEFT JOIN LATERAL (
        SELECT ps.id, ps.estudiante_cumplimentado_1
        FROM permutas_permuta pp
        INNER JOIN permutas ps ON ps.id = pp.permutas_id_fk
        WHERE pp.permuta_id_fk = p.id
          AND ps.vigente = true
        ORDER BY ps.id DESC
        LIMIT 1
      ) documento ON true
      WHERE (p.usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
         OR p.usuario_id_2_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)) 
        AND (p.estado = 'VALIDADA' OR p.estado = 'FINALIZADA')
        AND p.vigente = true
      ORDER BY usuario_1_uvus, usuario_2_uvus, p.id
    `,
      values: [uvus],
    };

    const res = await conexion.query(query);

    // Un mismo par de estudiantes puede tener varios documentos históricos.
    // Cada documento debe conservarse como un flujo independiente.
    const permutasAgrupadas = res.rows.reduce((acc, row) => {
      const pareja = `${row.usuario_1_uvus}-${row.usuario_2_uvus}`;
      const key = row.documento_permuta_id
        ? `${pareja}-documento-${row.documento_permuta_id}`
        : `${pareja}-pendiente`;
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
          a.curso, sp.bloque_id,
          ARRAY(SELECT miembro.id_asignatura_fk FROM solicitud_permuta miembro
            WHERE miembro.bloque_id = sp.bloque_id) AS asignaturas_bloque,
          sp.grupo_solicitante_id_fk AS grupo_actual,
          gd.grupo_id_fk AS grupo_deseado
        FROM solicitud_permuta sp
        INNER JOIN asignatura a ON a.id = sp.id_asignatura_fk
        INNER JOIN grupo_deseado gd ON gd.solicitud_permuta_id_fk = sp.id
        INNER JOIN grupo actual ON actual.id = sp.grupo_solicitante_id_fk
        INNER JOIN grupo deseado ON deseado.id = gd.grupo_id_fk
        WHERE sp.estado = 'SOLICITADA' AND sp.vigente = true
          AND actual.habilitado = true AND deseado.habilitado = true
          AND EXISTS (SELECT 1 FROM usuario_grupo ug WHERE ug.usuario_id_fk = sp.usuario_id_fk
            AND ug.grupo_id_fk = sp.grupo_solicitante_id_fk)
          AND EXISTS (SELECT 1 FROM usuario_asignatura ua WHERE ua.usuario_id_fk = sp.usuario_id_fk
            AND ua.asignatura_id_fk = sp.id_asignatura_fk)
          AND actual.asignatura_id_fk = sp.id_asignatura_fk
          AND deseado.asignatura_id_fk = sp.id_asignatura_fk
          AND NOT EXISTS (
            SELECT 1 FROM permuta p
            WHERE p.vigente = true
              AND p.estado IN ('PROPUESTA', 'ACEPTADA', 'VALIDADA', 'FINALIZADA')
              AND p.asignatura_id_fk = sp.id_asignatura_fk
              AND sp.usuario_id_fk IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
          )
      `);

      const emparejamientos = new PermutaMatching(solicitudesRes.rows).construirGrafo().emparejar();
      let propuestasCreadas = 0;
      for (const permuta of emparejamientos) {
        const bloquesPorCurso = new Map();
        for (const fila of solicitudesRes.rows) {
          if (fila.bloque_id && [permuta.estudiante1, permuta.estudiante2].includes(String(fila.estudiante_id))
            && permuta.asignaturas.includes(fila.asignatura) && !bloquesPorCurso.has(String(fila.curso))) {
            bloquesPorCurso.set(String(fila.curso), randomUUID());
          }
        }
        for (const asignatura of permuta.asignaturas) {
          const curso = solicitudesRes.rows.find(fila => fila.asignatura === asignatura)?.curso;
          const bloqueId = bloquesPorCurso.get(String(curso)) ?? null;
          const resultado = await conexion.query({
            text: `INSERT INTO permuta (
              solicitud_permuta_id_fk, usuario_id_1_fk, usuario_id_2_fk,
              asignatura_id_fk, grupo_id_1_fk, grupo_id_2_fk,
              estado, aceptada_1, aceptada_2, bloque_id
            ) SELECT
              sp1.id, $1, $2, $3, sp1.grupo_solicitante_id_fk,
              sp2.grupo_solicitante_id_fk, 'PROPUESTA', false, false, $4
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
            values: [permuta.estudiante1, permuta.estudiante2, asignatura, bloqueId]
          });
          if (resultado.rowCount !== 1) throw crearErrorSolicitud(409, 'Las solicitudes han cambiado; no se ha creado ninguna propuesta.');
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
            a.curso, p.bloque_id, (p.bloque_id IS NOT NULL) AS en_bloque,
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

  async responderPermutaPropuesta(uvus, permutaId, aceptar) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query('BEGIN');
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);
      const inicial = await conexion.query({
        text: `SELECT p.id, p.bloque_id, u.id AS usuario_id FROM permuta p
          JOIN usuario u ON u.nombre_usuario = $2
          WHERE p.id = $1 AND u.id IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
            AND p.estado = 'PROPUESTA' AND p.vigente = true FOR UPDATE OF p`,
        values: [permutaId, uvus],
      });
      if (!inicial.rows.length) throw crearErrorSolicitud(409, 'La propuesta no está disponible para el usuario.');
      const { bloque_id, usuario_id } = inicial.rows[0];
      const grupo = await conexion.query({
        text: `SELECT id, usuario_id_1_fk, usuario_id_2_fk, estado, vigente FROM permuta
          WHERE id = $1 OR ($2::uuid IS NOT NULL AND bloque_id = $2)
          ORDER BY id FOR UPDATE`,
        values: [permutaId, bloque_id],
      });
      if (grupo.rows.some(p => p.estado !== 'PROPUESTA' || p.vigente !== true
        || ![p.usuario_id_1_fk, p.usuario_id_2_fk].includes(usuario_id))) {
        throw crearErrorSolicitud(409, 'El bloque completo ya no está disponible.');
      }
      const ids = grupo.rows.map(p => p.id);
      await conexion.query({
        text: aceptar ? `UPDATE permuta SET
          aceptada_1 = aceptada_1 OR usuario_id_1_fk = $2,
          aceptada_2 = aceptada_2 OR usuario_id_2_fk = $2,
          estado = CASE WHEN (aceptada_1 OR usuario_id_1_fk = $2)
            AND (aceptada_2 OR usuario_id_2_fk = $2) THEN 'VALIDADA' ELSE 'PROPUESTA' END
          WHERE id = ANY($1::int[])`
          : `UPDATE permuta SET estado = 'RECHAZADA' WHERE id = ANY($1::int[])`,
        values: aceptar ? [ids, usuario_id] : [ids],
      });
      await conexion.query('COMMIT');
      return aceptar ? 'Has aceptado la permuta propuesta' : 'Has rechazado la permuta propuesta';
    } catch (error) {
      await conexion.query('ROLLBACK');
      throw error;
    } finally {
      await conexion.end();
    }
  }

  async aceptarPermutaPropuesta(uvus, permutaId) {
    return this.responderPermutaPropuesta(uvus, permutaId, true);
  }

  async rechazarPermutaPropuesta(uvus, permutaId) {
    return this.responderPermutaPropuesta(uvus, permutaId, false);
  }

  async getTodasSolicitudesPermuta() {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
        SELECT 
          sp.id AS solicitud_id,
          a.curso, sp.bloque_id, (sp.bloque_id IS NOT NULL) AS en_bloque,
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
            curso: row.curso,
            bloque_id: row.bloque_id ?? null,
            en_bloque: row.en_bloque === true,
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
            sp.bloque_id,
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

      let asignaturas = [solicitud.id_asignatura_fk];
      let solicitudesIds = [solicitudId];
      if (solicitud.bloque_id) {
        const miembros = await conexion.query({
          text: `SELECT id, id_asignatura_fk, estado, vigente FROM solicitud_permuta
            WHERE bloque_id = $1 ORDER BY id FOR UPDATE`,
          values: [solicitud.bloque_id],
        });
        if (miembros.rows.some(s => s.estado !== 'SOLICITADA' || s.vigente !== true)) {
          throw crearErrorSolicitud(409, 'El bloque completo ya no puede cancelarse.');
        }
        asignaturas = miembros.rows.map(s => s.id_asignatura_fk);
        solicitudesIds = miembros.rows.map(s => s.id);
      }
      const permutaActivaRes = await conexion.query({
        text: `
          SELECT 1
          FROM permuta p
          WHERE p.vigente = true
            AND p.estado = ANY($3::text[])
            AND p.asignatura_id_fk = ANY($1::int[])
            AND $2 IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
          LIMIT 1
        `,
        values: [asignaturas, solicitud.usuario_id_fk, ESTADOS_PERMUTA_ACTIVA],
      });
      if (permutaActivaRes.rows.length > 0) {
        throw crearErrorSolicitud(409, 'La solicitud no puede cancelarse porque ya tiene una permuta activa.');
      }

      await conexion.query({
        text: `UPDATE solicitud_permuta SET estado = 'CANCELADA' WHERE id = ANY($1::int[])`,
        values: [solicitudesIds],
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
