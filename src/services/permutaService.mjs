import eventosNotificacion from './eventosNotificacionService.mjs';
import { cambiarEstadoDocumento } from './documentoPermutaEstadoService.mjs';
import { comprobarBloquesCompletos, rechazarPermutaIndividual } from './permutaBloqueService.mjs';
import database from "../config/database.mjs";
import { sendMessage } from "./telegramService.mjs"
import autorizacionService from "./autorizacionService.mjs";
import { mensajeFirmadaPermutaAlumno1, mensajeFirmadaPermutaAlumno2,mensajeAceptadaPermuta, mensajeValidacionPermuta,mensajeBorradorPermuta } from "../utils/mensajesTelegram.mjs";
import email from "../utils/email.mjs";
import usuarioService from "./usuarioService.mjs";
import { autorizarNuevoDocumento, validarIdsDocumento } from './documentoAutorizacionService.mjs';
import { exigirArchivoPropio } from './archivoService.mjs';
class PermutaService {
  async crearListaPermutas(archivo, IdsPermuta, uvus) {
    validarIdsDocumento(IdsPermuta, uvus);
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query("BEGIN");
      await conexion.query("SELECT pg_advisory_xact_lock(hashtext('proponer_permutas_optimas'))");
      await comprobarBloquesCompletos(conexion, IdsPermuta);
      await autorizarNuevoDocumento(conexion, IdsPermuta, uvus);
      await exigirArchivoPropio(conexion, 'archivador', archivo, uvus);
      const queryPermutas = {
        text: ` INSERT INTO permutas (estado, archivo ) VALUES ('FIRMADA',$1) 
                RETURNING id`,
        values: [archivo],
      };
      const resultado = await conexion.query(queryPermutas);
      const permutasId = resultado.rows[0].id;
      for (const id of IdsPermuta) {
        const queryPermutas_permuta = {
          text: ` INSERT INTO permutas_permuta (permuta_id_fk, permutas_id_fk) 
                  VALUES ($1, $2)`,
          values: [id, permutasId],
        };
        await conexion.query(queryPermutas_permuta);
      }
      await eventosNotificacion.registrar(conexion, { origen: 'documento', ids: [permutasId], evento: 'FIRMADA',
        contenido: 'Se ha creado un documento de permuta firmado.' });
      await conexion.query("COMMIT");
      return "Se ha creado la lista de permutas correctamente";
    } catch (error) {
      await conexion.query("ROLLBACK");
      console.error("Error al listar permutas:", error);
      if (error.statusCode) throw error;
      throw new Error("Error al listar permutas");
    } finally {
      await conexion.end();
    }
  }

  async generarBorradorPermutas(IdsPermuta, uvus) {
    validarIdsDocumento(IdsPermuta, uvus);
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query("BEGIN");
      await conexion.query("SELECT pg_advisory_xact_lock(hashtext('proponer_permutas_optimas'))");
      await comprobarBloquesCompletos(conexion, IdsPermuta);
      await autorizarNuevoDocumento(conexion, IdsPermuta, uvus);
      const queryPermutas = {
        text: ` INSERT INTO permutas (estado, estudiante_cumplimentado_1 ) VALUES ('BORRADOR', $1) 
                RETURNING id`,
        values: [uvus],
      };
      const resultado = await conexion.query(queryPermutas);
      const permutasId = resultado.rows[0].id;
      for (const id of IdsPermuta) {
        const queryPermutas_permuta = {
          text: ` INSERT INTO permutas_permuta (permuta_id_fk, permutas_id_fk) 
                  VALUES ($1, $2);`,
          values: [id, permutasId],
        };
        const queryPermutas_permuta_update = {
          text: `Update permuta set estado = 'FINALIZADA' where id = $1;`,
          values: [id],
        };
        await conexion.query(queryPermutas_permuta_update);
        await conexion.query(queryPermutas_permuta);
      }
      await eventosNotificacion.registrar(conexion, { origen: 'documento', ids: [permutasId], evento: 'BORRADOR',
        contenido: 'Se ha generado el borrador de vuestro documento de permuta. El primer participante puede firmarlo.' });
      await conexion.query("COMMIT");
      // Enviar mensaje por Telegram
      try {
        const chatIdEstudiante = await autorizacionService?.obtenerChatIdUsuario(uvus);
        await sendMessage(chatIdEstudiante, mensajeBorradorPermuta);
      } catch (msgError) {
        console.error("Error enviando mensaje de validación:", msgError);
      }
      // Enviar mensaje por email
      try{
        const usuarioDatos = await usuarioService.obtenerDatosUsuario(uvus);
        await email.sendEmailToStudentsDocumentoPermuta(usuarioDatos, 'Borrador de Permuta Generado', "plantillaEmailDocumentoPermuta.ejs");
      }catch(msgError){
        console.error("Error enviando email de borrador de permuta:", msgError);
      }
      return "Se ha creado la lista de permutas correctamente";
    } catch (error) {
      await conexion.query("ROLLBACK");
      console.error("Error al listar permutas:", error);
      if (error.statusCode) throw error;
      throw new Error("Error al listar permutas");
    } finally {
      await conexion.end();
    }
  }

  async listarPermutas(IdsPermuta, uvus) {
    validarIdsDocumento(IdsPermuta, uvus);
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `WITH ids_seleccionados AS (
                 SELECT DISTINCT UNNEST($1::int[]) AS permuta_id
               )
               SELECT ps.id, ps.estado, ps.archivo
               FROM permutas ps
               INNER JOIN permutas_permuta pp ON pp.permutas_id_fk = ps.id
               INNER JOIN ids_seleccionados seleccion
                 ON seleccion.permuta_id = pp.permuta_id_fk
               WHERE ps.vigente = true
                 AND NOT EXISTS (
                   SELECT 1 FROM permutas_permuta pp2 JOIN permuta p ON p.id = pp2.permuta_id_fk
                   WHERE pp2.permutas_id_fk = ps.id AND NOT EXISTS (
                     SELECT 1 FROM usuario u WHERE u.nombre_usuario = $2 AND u.activo = true
                       AND u.id IN (p.usuario_id_1_fk, p.usuario_id_2_fk)))
               GROUP BY ps.id, ps.estado, ps.archivo
               HAVING COUNT(DISTINCT pp.permuta_id_fk) = (
                 SELECT COUNT(*) FROM ids_seleccionados
               )
               ORDER BY ps.id DESC
               LIMIT 1`,
        values: [IdsPermuta, uvus],
      };
      const resultado = await conexion.query(query);

      if (resultado.rows.length === 0) {
        throw new Error(
          "Las permutas seleccionadas no pertenecen a un mismo documento"
        );
      }

      return resultado.rows;
    } catch (error) {
      console.error("Error al listar permutas:", error);
      throw error;
    } finally {
      await conexion.end();
    }
  }

  async notificarDocumentoTelegram(participantes, mensaje) {
    for (const uvus of participantes) {
      try {
        const chatId = await autorizacionService.obtenerChatIdUsuario(uvus);
        await sendMessage(chatId, typeof mensaje === 'function' ? mensaje(uvus) : mensaje);
      } catch (error) { console.error('Error notificando documento por Telegram:', error); }
    }
  }

  async firmarPermuta(permutaId, archivo, uvus) {
    const { participantes, cambiado } = await cambiarEstadoDocumento(permutaId, 'FIRMADA', { archivo, uvus });
    if (cambiado) await this.notificarDocumentoTelegram(participantes, usuario => usuario === uvus
      ? mensajeFirmadaPermutaAlumno1(participantes.find(u => u !== uvus)) : mensajeFirmadaPermutaAlumno2(uvus));
    return 'La permuta ha sido firmada correctamente';
  }

  async aceptarPermuta(permutaId, archivo, uvus) {
    const { participantes, cambiado } = await cambiarEstadoDocumento(permutaId, 'ACEPTADA', { archivo, uvus });
    if (cambiado) await this.notificarDocumentoTelegram(participantes, mensajeAceptadaPermuta);
    return 'La permuta ha sido aceptada correctamente';
  }

  async validarPermuta(permutaId, uvus) {
    const { participantes, cambiado } = await cambiarEstadoDocumento(permutaId, 'VALIDADA', { uvus });
    if (cambiado) await this.notificarDocumentoTelegram(participantes, mensajeValidacionPermuta);
  }

  async rechazarSolicitudPermuta(uvus, solicitud) {
    return rechazarPermutaIndividual(uvus, solicitud);
  }

  async misPermutasPropuestas(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
          SELECT 
            p.id AS permuta_id,
            a.curso, p.bloque_id, (p.bloque_id IS NOT NULL) AS en_bloque,
            a.nombre AS nombre_asignatura,
            a.codigo AS codigo_asignatura,
            g1.nombre AS grupo_solicitante,
            g2.nombre AS grupo_solicitado,
            p.estado AS estado
          FROM permuta p
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          WHERE p.usuario_id_1_fk = (
            SELECT id FROM usuario WHERE nombre_usuario = $1
          )
          and p.aceptada_2 = true
          AND p.aceptada_1 = false
          AND p.estado = 'ACEPTADA'
          AND p.vigente = true
        `,
        values: [uvus],
      };

      const resultado = await conexion.query(query);
      await conexion.end();
      return resultado.rows;
    } catch (error) {
      console.error("Error al obtener las permutas propuestas:", error);
      throw new Error("Error al obtener las permutas propuestas");
    } finally {
      await conexion.end();
    }
  }

  async misPermutasPropuestasPorMi(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
          SELECT 
            p.id AS permuta_id,
            a.curso, p.bloque_id, (p.bloque_id IS NOT NULL) AS en_bloque,
            a.nombre AS nombre_asignatura,
            a.codigo AS codigo_asignatura,
            g1.nombre AS grupo_solicitado,
            g2.nombre AS grupo_solicitante,
            p.estado AS estado
          FROM permuta p
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          WHERE p.usuario_id_2_fk = (
            SELECT id FROM usuario WHERE nombre_usuario = $1
          )
          AND p.aceptada_1 = false
          AND p.aceptada_2 = true
          AND p.estado = 'ACEPTADA'
          AND p.vigente = true
        `,
        values: [uvus],
      };

      const resultado = await conexion.query(query);
      await conexion.end();
      return resultado.rows;
    } catch (error) {
      console.error("Error al obtener las permutas propuestas por mí:", error);
      throw new Error("Error al obtener las permutas propuestas por mí");
    } finally {
      await conexion.end();
    }
  }

  async obtenerPermutasValidadasPorUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
          SELECT 
            p.id AS permuta_id,
            a.curso, p.bloque_id, (p.bloque_id IS NOT NULL) AS en_bloque,
            a.nombre AS nombre_asignatura,
            a.codigo AS codigo_asignatura,
            g1.nombre AS grupo_1,
            g2.nombre AS grupo_2,
            p.estado AS estado
          FROM permuta p
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          WHERE p.aceptada_1 = true
            AND p.aceptada_2 = true
            AND (p.estado = 'VALIDADA' OR p.estado ='FINALIZADA')
            AND (
              p.usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
              OR p.usuario_id_2_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
            )
            AND p.vigente = true
        `,
        values: [uvus],
      };

      const resultado = await conexion.query(query);
      await conexion.end();
      return resultado.rows;
    } catch (error) {
      console.error(
        "Error al obtener las permutas validadas por usuario:",
        error
      );
      throw new Error("Error al obtener las permutas validadas por usuario");
    } finally {
      await conexion.end();
    }
  }

  async obtenerPermutasAgrupadasPorUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
    SELECT
      p.id AS permuta_id,
      a.curso, p.bloque_id, (p.bloque_id IS NOT NULL) AS en_bloque,
      a.nombre AS nombre_asignatura,
      a.codigo AS codigo_asignatura,
      g1.nombre AS grupo_1,
      g2.nombre AS grupo_2,
      p.estado AS estado,
      u1.nombre_usuario AS usuario_1_uvus,
      u1.nombre_completo AS usuario_1_nombre,
      u1.correo AS usuario_1_correo,
      u2.nombre_usuario AS usuario_2_uvus,
      u2.nombre_completo AS usuario_2_nombre,
      u2.correo AS usuario_2_correo,
      LEAST(u1.nombre_usuario, u2.nombre_usuario) AS usuario_primario,
      GREATEST(u1.nombre_usuario, u2.nombre_usuario) AS usuario_secundario,
      documento.id AS documento_permuta_id,
      documento.estado AS estado_permuta_asociada,
      documento.estudiante_cumplimentado_1,
      documento.estudiante_cumplimentado_2
    FROM permuta p
    INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
    INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
    INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
    INNER JOIN usuario u1 ON p.usuario_id_1_fk = u1.id
    INNER JOIN usuario u2 ON p.usuario_id_2_fk = u2.id
    LEFT JOIN LATERAL (
      SELECT
        ps.id,
        ps.estado,
        ps.estudiante_cumplimentado_1,
        ps.estudiante_cumplimentado_2
      FROM permutas_permuta pp
      INNER JOIN permutas ps ON ps.id = pp.permutas_id_fk
      WHERE pp.permuta_id_fk = p.id
        AND ps.vigente = true
      ORDER BY ps.id DESC
      LIMIT 1
    ) documento ON true
    WHERE (
      p.usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
      OR p.usuario_id_2_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
    )
    AND (p.estado = 'VALIDADA' OR p.estado = 'FINALIZADA')
    AND p.aceptada_1 = true
    AND p.aceptada_2 = true
    AND p.vigente = true
    ORDER BY documento.id DESC NULLS LAST, p.id
        `,
        values: [uvus],
      };

      const resultado = await conexion.query(query);

      // Cada documento es un flujo independiente. Las permutas aún sin
      // documento se agrupan por pareja para poder generar un único borrador.
      const permutasAgrupadas = resultado.rows.reduce((acc, row) => {
        const pareja = `${row.usuario_primario}-${row.usuario_secundario}`;
        const key = row.documento_permuta_id
          ? `${pareja}-documento-${row.documento_permuta_id}`
          : `${pareja}-pendiente`;

        if (!acc[key]) {
          const usuarioPrimario = row.usuario_primario?.trim();
          const usuarioSecundario = row.usuario_secundario?.trim();
          const estudiante1 = row.estudiante_cumplimentado_1?.trim();
          const estudiante2 =
            row.estudiante_cumplimentado_2?.trim() ||
            (estudiante1 === usuarioPrimario
              ? usuarioSecundario
              : usuarioPrimario);

          acc[key] = {
            usuarios: estudiante1
              ? [estudiante1, estudiante2]
              : [usuarioPrimario, usuarioSecundario],
            participantes_por_uvus: {
              [row.usuario_1_uvus?.trim()]: {
                uvus: row.usuario_1_uvus?.trim(),
                nombre_completo: row.usuario_1_nombre,
                correo: row.usuario_1_correo,
              },
              [row.usuario_2_uvus?.trim()]: {
                uvus: row.usuario_2_uvus?.trim(),
                nombre_completo: row.usuario_2_nombre,
                correo: row.usuario_2_correo,
              },
            },
            documento_permuta_id: row.documento_permuta_id ?? null,
            estado_documento: row.estado_permuta_asociada ?? null,
            estudiante_cumplimentado_1: estudiante1 || null,
            estudiante_cumplimentado_2:
              row.estudiante_cumplimentado_2?.trim() || null,
            permutas: [],
          };
        }

        acc[key].permutas.push({
          permuta_id: row.permuta_id,
          curso: row.curso,
          bloque_id: row.bloque_id ?? null,
          en_bloque: row.en_bloque === true,
          nombre_asignatura: row.nombre_asignatura,
          codigo_asignatura: row.codigo_asignatura,
          grupo_1: row.grupo_1,
          grupo_2: row.grupo_2,
          usuario_1_uvus: row.usuario_1_uvus?.trim(),
          usuario_2_uvus: row.usuario_2_uvus?.trim(),
          estado: row.estado,
          estado_permuta_asociada: row.estado_permuta_asociada,
        });
        return acc;
      }, {});

      return Object.values(permutasAgrupadas).map((grupo) => {
        const participantes = grupo.usuarios.map((usuario) =>
          grupo.participantes_por_uvus[usuario] ?? {
            uvus: usuario,
            nombre_completo: usuario,
            correo: null,
          }
        );
        const estado = String(grupo.estado_documento || '').toUpperCase();
        let usuarioPendiente = null;
        if (estado === 'BORRADOR' && grupo.estudiante_cumplimentado_1 && !grupo.estudiante_cumplimentado_2) {
          usuarioPendiente = grupo.estudiante_cumplimentado_1;
        } else if (estado === 'FIRMADA' && grupo.estudiante_cumplimentado_1 && !grupo.estudiante_cumplimentado_2) {
          usuarioPendiente = grupo.usuarios.find((usuario) => usuario !== grupo.estudiante_cumplimentado_1) ?? null;
        }

        const resultadoGrupo = { ...grupo };
        delete resultadoGrupo.participantes_por_uvus;
        return {
          ...resultadoGrupo,
          participantes,
          usuario_pendiente: usuarioPendiente,
          puede_notificar_companero: Boolean(usuarioPendiente && usuarioPendiente !== uvus),
        };
      });
    } catch (error) {
      console.error(
        "Error al obtener las permutas agrupadas por usuario:",
        error
      );
      throw new Error("Error al obtener las permutas agrupadas por usuario");
    } finally {
      await conexion.end();
    }
  }

  async notificarRecordatorioTelegram(uvus, mensaje) {
    try {
      const chatId = await autorizacionService.obtenerChatIdUsuario(uvus);
      if (chatId === null || chatId === undefined || (typeof chatId === 'object' && chatId.err)) return false;
      const mensajeSeguro = mensaje.replace(/[&<>]/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[caracter]);
      return await sendMessage(chatId, mensajeSeguro) === true;
    } catch (error) {
      console.error('Error enviando el recordatorio de permuta por Telegram:', error);
      return false;
    }
  }

  async recordarCompletarDocumento(documentoId, uvusSolicitante) {
    const conexion = await database.connectPostgreSQL();
    let confirmada = false;
    try {
      await conexion.query('BEGIN');
      await conexion.query({
        text: `SELECT pg_advisory_xact_lock(hashtext('recordatorio_documento:' || $1::text))`,
        values: [documentoId],
      });
      const documentoRes = await conexion.query({
        text: `SELECT id, estado, estudiante_cumplimentado_1, estudiante_cumplimentado_2
          FROM permutas WHERE id = $1 AND vigente = true FOR UPDATE`,
        values: [documentoId],
      });
      if (documentoRes.rowCount !== 1) {
        throw Object.assign(new Error('El documento de permuta no está disponible.'), { statusCode: 404 });
      }

      const participantesRes = await conexion.query({
        text: `SELECT DISTINCT u.id, u.nombre_usuario, u.nombre_completo, u.correo
          FROM permutas_permuta pp
          INNER JOIN permuta p ON p.id = pp.permuta_id_fk AND p.vigente = true
          CROSS JOIN LATERAL (VALUES (p.usuario_id_1_fk), (p.usuario_id_2_fk)) participante(usuario_id)
          INNER JOIN usuario u ON u.id = participante.usuario_id
          WHERE pp.permutas_id_fk = $1`,
        values: [documentoId],
      });
      const participantes = participantesRes.rows;
      const solicitante = participantes.find((p) => p.nombre_usuario?.trim() === uvusSolicitante?.trim());
      if (!solicitante) {
        throw Object.assign(new Error('No participas en este documento de permuta.'), { statusCode: 403 });
      }
      if (participantes.length !== 2) {
        throw Object.assign(new Error('No se ha podido determinar la pareja de esta permuta.'), { statusCode: 409 });
      }

      const documento = documentoRes.rows[0];
      const estado = String(documento.estado || '').toUpperCase();
      const primero = documento.estudiante_cumplimentado_1?.trim();
      const segundo = documento.estudiante_cumplimentado_2?.trim();
      let uvusPendiente = null;
      if (estado === 'BORRADOR' && primero && !segundo) {
        uvusPendiente = primero;
      } else if (estado === 'FIRMADA' && primero && !segundo) {
        uvusPendiente = participantes.find((p) => p.nombre_usuario?.trim() !== primero)?.nombre_usuario?.trim() ?? null;
      }
      if (!uvusPendiente) {
        throw Object.assign(new Error('El documento no tiene ninguna parte pendiente que pueda notificarse.'), { statusCode: 409 });
      }
      if (uvusPendiente === uvusSolicitante?.trim()) {
        throw Object.assign(new Error('Tu parte del documento es la que está pendiente.'), { statusCode: 409 });
      }

      const pendiente = participantes.find((p) => p.nombre_usuario?.trim() === uvusPendiente);
      if (!pendiente) {
        throw Object.assign(new Error('No se ha podido determinar quién debe completar el documento.'), { statusCode: 409 });
      }
      const prefijoClave = `documento:${documentoId}:recordatorio:${pendiente.id}:`;
      const reciente = await conexion.query({
        text: `SELECT 1 FROM notificacion
          WHERE destinatario_id_fk = $1
            AND clave_evento LIKE $2
            AND fecha_creacion > NOW() - INTERVAL '15 minutes'
          LIMIT 1`,
        values: [pendiente.id, `${prefijoClave}%`],
      });
      if (reciente.rowCount > 0) {
        throw Object.assign(new Error('Ya se ha enviado un recordatorio recientemente. Espera 15 minutos para volver a intentarlo.'), { statusCode: 429 });
      }

      const nombreSolicitante = solicitante.nombre_completo?.trim() || solicitante.nombre_usuario?.trim();
      const mensaje = `${nombreSolicitante} quiere que termines el proceso de permuta que tiene contigo. Rellena el documento cuando te sea posible.`;
      await conexion.query({
        text: `INSERT INTO notificacion
          (usuario_id_fk, contenido, receptor, destinatario_id_fk, tipo, enlace, clave_evento)
          VALUES ($1, $2, 'personal', $3, 'DOCUMENTO', '/permutasAceptadas', $4)`,
        values: [solicitante.id, mensaje, pendiente.id, `${prefijoClave}${new Date().toISOString()}`],
      });
      await conexion.query('COMMIT');
      confirmada = true;

      const telegramEnviado = await this.notificarRecordatorioTelegram(uvusPendiente, mensaje);
      return {
        notificacionSistema: true,
        telegramEnviado,
        destinatario: {
          uvus: uvusPendiente,
          nombre_completo: pendiente.nombre_completo,
        },
        proximoRecordatorioMinutos: 15,
      };
    } catch (error) {
      if (!confirmada) await conexion.query('ROLLBACK');
      if (error.statusCode) throw error;
      console.error('Error al recordar la cumplimentación de la permuta:', error);
      throw new Error('No se pudo enviar el recordatorio de la permuta.');
    } finally {
      await conexion.end();
    }
  }
async actualizarLaVigenciaPermuta() {
  const conexion = await database.connectPostgreSQL();
  try {
    const updateQuery = {
      text: `UPDATE permuta SET vigente = false WHERE vigente = true`,
    };
    const res = await conexion.query(updateQuery);
    return { updated: res.rowCount };
  } catch (error) {
    console.error("Error al actualizar la vigencia de las permutas:", error);
    throw new Error("Error al actualizar la vigencia de las permutas");
  } finally {
    await conexion.end();
  }
}

async actualizarLaVigenciaPermutas() {
  const conexion = await database.connectPostgreSQL();
  try {
    const updateQuery = {
      text: `UPDATE permutas SET vigente = false WHERE vigente = true`,
    };
    const res = await conexion.query(updateQuery);
    return { updated: res.rowCount };
  } catch (error) {
    console.error("Error al actualizar la vigencia de las permutas agrupadas:", error);
    throw new Error("Error al actualizar la vigencia de las permutas agrupadas");
  } finally {
    await conexion.end();
  }
}

}

const permutaService = new PermutaService();
export default permutaService;
