import database from '../config/database.mjs';
import eventosNotificacion from './eventosNotificacionService.mjs';

const BLOQUEO_PROPUESTAS_PERMUTA = "SELECT pg_advisory_xact_lock(hashtext('proponer_permutas_optimas'))";
const ESTADOS_PERMUTA_ACTIVA = ['PROPUESTA', 'ACEPTADA', 'VALIDADA', 'FINALIZADA'];

const crearError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizarIds = (filas) => [...new Set(filas.map(({ id }) => Number(id)))];

class AdminPermutasService {
  async obtenerPanel() {
    const conexion = await database.connectPostgreSQL();
    try {
      const resumenRes = await conexion.query({
        text: `SELECT
          (SELECT COUNT(*)::int FROM solicitud_permuta WHERE vigente = true) AS solicitudes_vigentes,
          (SELECT COUNT(*)::int FROM solicitud_permuta
            WHERE vigente = true AND estado = 'SOLICITADA') AS solicitudes_pendientes,
          (SELECT COUNT(*)::int FROM permuta WHERE vigente = true) AS permutas_vigentes,
          (SELECT COUNT(*)::int FROM permuta
            WHERE vigente = true AND estado = 'PROPUESTA') AS propuestas_pendientes,
          (SELECT COUNT(*)::int FROM permuta
            WHERE vigente = true AND estado IN ('VALIDADA', 'FINALIZADA')) AS permutas_confirmadas,
          (SELECT COUNT(*)::int FROM permutas WHERE vigente = true) AS documentos_vigentes`,
      });

      const solicitudesRes = await conexion.query({
        text: `SELECT
          sp.id AS solicitud_id, sp.estado, sp.vigente, sp.bloque_id,
          (sp.bloque_id IS NOT NULL) AS en_bloque,
          u.nombre_usuario AS usuario_uvus, u.nombre_completo AS usuario_nombre,
          e.siglas AS usuario_estudio,
          a.id AS asignatura_id, a.codigo AS asignatura_codigo,
          a.nombre AS asignatura_nombre, a.curso,
          g.nombre AS grupo_solicitante,
          COALESCE(
            ARRAY_AGG(DISTINCT gdg.nombre::text ORDER BY gdg.nombre::text)
              FILTER (WHERE gdg.id IS NOT NULL),
            ARRAY[]::text[]
          ) AS grupos_deseados
        FROM solicitud_permuta sp
        INNER JOIN usuario u ON u.id = sp.usuario_id_fk
        LEFT JOIN estudios e ON e.id = u.estudios_id_fk
        INNER JOIN asignatura a ON a.id = sp.id_asignatura_fk
        INNER JOIN grupo g ON g.id = sp.grupo_solicitante_id_fk
        LEFT JOIN grupo_deseado gd ON gd.solicitud_permuta_id_fk = sp.id
        LEFT JOIN grupo gdg ON gdg.id = gd.grupo_id_fk
        GROUP BY sp.id, sp.estado, sp.vigente, sp.bloque_id,
          u.nombre_usuario, u.nombre_completo, e.siglas,
          a.id, a.codigo, a.nombre, a.curso, g.nombre
        ORDER BY sp.vigente DESC, sp.id DESC`,
      });

      const permutasRes = await conexion.query({
        text: `SELECT
          p.id AS permuta_id, p.solicitud_permuta_id_fk AS solicitud_origen_id,
          p.estado, p.vigente, p.bloque_id,
          (p.bloque_id IS NOT NULL) AS en_bloque,
          p.aceptada_1, p.aceptada_2,
          a.codigo AS asignatura_codigo, a.nombre AS asignatura_nombre, a.curso,
          u1.nombre_usuario AS usuario_1_uvus, u1.nombre_completo AS usuario_1_nombre,
          u2.nombre_usuario AS usuario_2_uvus, u2.nombre_completo AS usuario_2_nombre,
          g1.nombre AS grupo_1, g2.nombre AS grupo_2,
          COALESCE(
            ARRAY_AGG(DISTINCT ps.id ORDER BY ps.id) FILTER (WHERE ps.id IS NOT NULL),
            ARRAY[]::int[]
          ) AS documentos_ids
        FROM permuta p
        INNER JOIN asignatura a ON a.id = p.asignatura_id_fk
        INNER JOIN usuario u1 ON u1.id = p.usuario_id_1_fk
        INNER JOIN usuario u2 ON u2.id = p.usuario_id_2_fk
        INNER JOIN grupo g1 ON g1.id = p.grupo_id_1_fk
        INNER JOIN grupo g2 ON g2.id = p.grupo_id_2_fk
        LEFT JOIN permutas_permuta pp ON pp.permuta_id_fk = p.id
        LEFT JOIN permutas ps ON ps.id = pp.permutas_id_fk
        GROUP BY p.id, p.solicitud_permuta_id_fk, p.estado, p.vigente, p.bloque_id,
          p.aceptada_1, p.aceptada_2, a.codigo, a.nombre, a.curso,
          u1.nombre_usuario, u1.nombre_completo,
          u2.nombre_usuario, u2.nombre_completo, g1.nombre, g2.nombre
        ORDER BY p.vigente DESC, p.id DESC`,
      });

      return {
        resumen: resumenRes.rows[0],
        solicitudes: solicitudesRes.rows,
        permutas: permutasRes.rows,
      };
    } finally {
      await conexion.end();
    }
  }

  async cancelarSolicitud(solicitudId, motivo) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query('BEGIN');
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);
      const solicitudRes = await conexion.query({
        text: `SELECT sp.id, sp.usuario_id_fk, sp.bloque_id, sp.estado, sp.vigente
          FROM solicitud_permuta sp WHERE sp.id = $1 FOR UPDATE`,
        values: [solicitudId],
      });
      if (!solicitudRes.rows.length) throw crearError(404, 'Solicitud de permuta no encontrada.');
      const solicitud = solicitudRes.rows[0];
      if (!solicitud.vigente || solicitud.estado !== 'SOLICITADA') {
        throw crearError(409, 'La solicitud ya no está vigente o no se encuentra pendiente.');
      }
      const resultado = await this.cancelarPorUsuario(conexion, {
        usuarioId: solicitud.usuario_id_fk,
        solicitudId,
        solicitudBloqueId: solicitud.bloque_id,
        motivo,
      });
      await conexion.query('COMMIT');
      return resultado;
    } catch (error) {
      await conexion.query('ROLLBACK');
      throw error;
    } finally {
      await conexion.end();
    }
  }

  async cancelarPermuta(permutaId, usuarioUvus, motivo) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query('BEGIN');
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);
      const permutaRes = await conexion.query({
        text: `SELECT p.id, p.bloque_id, u.id AS usuario_id
          FROM permuta p
          INNER JOIN usuario u ON u.nombre_usuario = $2
            AND u.id IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
          WHERE p.id = $1 AND p.vigente = true AND p.estado = ANY($3::text[])
          FOR UPDATE OF p`,
        values: [permutaId, usuarioUvus, ESTADOS_PERMUTA_ACTIVA],
      });
      if (!permutaRes.rows.length) {
        throw crearError(404, 'La permuta no existe o el usuario indicado no participa en ella.');
      }
      const resultado = await this.cancelarPorUsuario(conexion, {
        usuarioId: permutaRes.rows[0].usuario_id,
        permutaId,
        permutaBloqueId: permutaRes.rows[0].bloque_id,
        motivo,
      });
      await conexion.query('COMMIT');
      return resultado;
    } catch (error) {
      await conexion.query('ROLLBACK');
      throw error;
    } finally {
      await conexion.end();
    }
  }

  async cancelarPorUsuario(conexion, {
    usuarioId, solicitudId = null, solicitudBloqueId = null,
    permutaId = null, permutaBloqueId = null, motivo,
  }) {
    let solicitudesRes;
    if (solicitudId) {
      solicitudesRes = await conexion.query({
        text: `SELECT id, id_asignatura_fk AS asignatura_id, bloque_id
          FROM solicitud_permuta
          WHERE id = $1 OR ($2::uuid IS NOT NULL AND bloque_id = $2)
          ORDER BY id FOR UPDATE`,
        values: [solicitudId, solicitudBloqueId],
      });
    } else {
      solicitudesRes = { rows: [] };
    }

    const asignaturasIniciales = solicitudesRes.rows.map(({ asignatura_id }) => asignatura_id);
    let permutasRes = await conexion.query({
      text: `SELECT p.id, p.bloque_id, p.asignatura_id_fk AS asignatura_id
        FROM permuta p
        WHERE ($1::int IS NOT NULL AND (
            p.id = $1 OR ($2::uuid IS NOT NULL AND p.bloque_id = $2)
          ))
          OR ($3::int[] IS NOT NULL AND p.vigente = true
            AND p.estado = ANY($5::text[])
            AND p.asignatura_id_fk = ANY($3::int[])
            AND $4 IN (p.usuario_id_1_fk, p.usuario_id_2_fk))
        ORDER BY p.id FOR UPDATE`,
      values: [permutaId, permutaBloqueId, asignaturasIniciales.length ? asignaturasIniciales : null,
        usuarioId, ESTADOS_PERMUTA_ACTIVA],
    });

    const bloquesPermuta = [...new Set(permutasRes.rows.map(({ bloque_id }) => bloque_id).filter(Boolean))];
    if (bloquesPermuta.length) {
      permutasRes = await conexion.query({
        text: `SELECT p.id, p.bloque_id, p.asignatura_id_fk AS asignatura_id
          FROM permuta p
          WHERE p.id = ANY($1::int[]) OR p.bloque_id = ANY($2::uuid[])
          ORDER BY p.id FOR UPDATE`,
        values: [normalizarIds(permutasRes.rows), bloquesPermuta],
      });
    }

    const asignaturasAfectadas = [...new Set([
      ...asignaturasIniciales,
      ...permutasRes.rows.map(({ asignatura_id }) => asignatura_id),
    ])];
    if (asignaturasAfectadas.length) {
      const solicitudesUsuarioRes = await conexion.query({
        text: `SELECT id, bloque_id FROM solicitud_permuta
          WHERE usuario_id_fk = $1 AND id_asignatura_fk = ANY($2::int[])
            AND vigente = true AND estado = 'SOLICITADA'
          ORDER BY id FOR UPDATE`,
        values: [usuarioId, asignaturasAfectadas],
      });
      const bloquesSolicitud = [...new Set(solicitudesUsuarioRes.rows
        .map(({ bloque_id }) => bloque_id).filter(Boolean))];
      if (bloquesSolicitud.length) {
        solicitudesRes = await conexion.query({
          text: `SELECT id, id_asignatura_fk AS asignatura_id, bloque_id
            FROM solicitud_permuta
            WHERE (usuario_id_fk = $1 AND id_asignatura_fk = ANY($2::int[]))
              OR bloque_id = ANY($3::uuid[])
            ORDER BY id FOR UPDATE`,
          values: [usuarioId, asignaturasAfectadas, bloquesSolicitud],
        });
      } else {
        const porId = new Map([...solicitudesRes.rows, ...solicitudesUsuarioRes.rows]
          .map((fila) => [fila.id, fila]));
        solicitudesRes = { rows: [...porId.values()] };
      }
    }

    const solicitudesIds = normalizarIds(solicitudesRes.rows);
    const permutasIds = normalizarIds(permutasRes.rows);
    let documentosIds = [];
    if (permutasIds.length) {
      const documentosRes = await conexion.query({
        text: `SELECT ps.id FROM permutas ps
          INNER JOIN permutas_permuta pp ON pp.permutas_id_fk = ps.id
          WHERE pp.permuta_id_fk = ANY($1::int[]) FOR UPDATE OF ps`,
        values: [permutasIds],
      });
      documentosIds = normalizarIds(documentosRes.rows);
      if (documentosIds.length) {
        await conexion.query({
          text: `UPDATE permutas SET vigente = false WHERE id = ANY($1::int[])`,
          values: [documentosIds],
        });
      }
      await conexion.query({
        text: `UPDATE permuta SET estado = 'RECHAZADA', vigente = false
          WHERE id = ANY($1::int[])`,
        values: [permutasIds],
      });
    }
    if (solicitudesIds.length) {
      await conexion.query({
        text: `UPDATE solicitud_permuta SET estado = 'CANCELADA', vigente = false
          WHERE id = ANY($1::int[])`,
        values: [solicitudesIds],
      });
    }

    const detalleMotivo = motivo ? ` Motivo: ${motivo}` : '';
    if (permutasIds.length) {
      await eventosNotificacion.registrar(conexion, {
        origen: 'permuta', ids: permutasIds, evento: `cancelada-admin:${usuarioId}`,
        contenido: `La administración ha cancelado la permuta.${detalleMotivo}`,
      });
    } else if (solicitudesIds.length) {
      await eventosNotificacion.registrar(conexion, {
        origen: 'solicitud', ids: solicitudesIds, evento: `cancelada-admin:${usuarioId}`,
        contenido: `La administración ha cancelado tu solicitud de permuta.${detalleMotivo}`,
      });
    }

    return {
      solicitudesCanceladas: solicitudesIds.length,
      permutasCanceladas: permutasIds.length,
      documentosRetirados: documentosIds.length,
    };
  }

  async retirarVigenciaGlobal(motivo) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query('BEGIN');
      await conexion.query(BLOQUEO_PROPUESTAS_PERMUTA);
      const solicitudes = await conexion.query({
        text: `UPDATE solicitud_permuta SET vigente = false
          WHERE vigente = true RETURNING id`,
      });
      const permutas = await conexion.query({
        text: `UPDATE permuta SET vigente = false
          WHERE vigente = true RETURNING id`,
      });
      const documentos = await conexion.query({
        text: `UPDATE permutas SET vigente = false
          WHERE vigente = true RETURNING id`,
      });
      if (solicitudes.rows.length) {
        await eventosNotificacion.registrar(conexion, {
          origen: 'solicitud', ids: normalizarIds(solicitudes.rows), evento: 'fin-vigencia-admin',
          contenido: `La administración ha cerrado la vigencia de las solicitudes.${motivo ? ` Motivo: ${motivo}` : ''}`,
        });
      }
      await conexion.query('COMMIT');
      return {
        solicitudesRetiradas: solicitudes.rowCount,
        permutasRetiradas: permutas.rowCount,
        documentosRetirados: documentos.rowCount,
      };
    } catch (error) {
      await conexion.query('ROLLBACK');
      throw error;
    } finally {
      await conexion.end();
    }
  }
}

export default new AdminPermutasService();
