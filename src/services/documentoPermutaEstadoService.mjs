import database from '../config/database.mjs';
import eventosNotificacion from './eventosNotificacionService.mjs';
import { exigirArchivoPropio } from './archivoService.mjs';

const transiciones = {
  FIRMADA: { previo: 'BORRADOR', contenido: 'El documento tiene la primera firma. Falta la firma del otro participante.' },
  ACEPTADA: { previo: 'FIRMADA', contenido: 'El documento ha sido firmado por ambos participantes y queda pendiente de validación.' },
  VALIDADA: { previo: 'ACEPTADA', contenido: 'Vuestro documento de permuta ha sido validado.' },
};

export async function cambiarEstadoDocumento(id, estado, { uvus, archivo } = {}) {
  const conexion = await database.connectPostgreSQL();
  try {
    await conexion.query('BEGIN');
    await conexion.query("SELECT pg_advisory_xact_lock(hashtext('proponer_permutas_optimas'))");
    const documentoRes = await conexion.query({
      text: 'SELECT * FROM permutas WHERE id = $1 AND vigente = true FOR UPDATE', values: [id],
    });
    const documento = documentoRes.rows[0];
    if (!documento) throw Object.assign(new Error('Documento no disponible.'), { statusCode: 404 });
    const participantesRes = await conexion.query({
      text: `SELECT DISTINCT u.nombre_usuario FROM usuario u
        JOIN permuta p ON u.id IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
        JOIN permutas_permuta pp ON pp.permuta_id_fk = p.id WHERE pp.permutas_id_fk = $1`,
      values: [id],
    });
    const participantes = participantesRes.rows.map(u => u.nombre_usuario.trim());
    if (!participantes.includes(uvus)
      || (estado === 'FIRMADA' && documento.estudiante_cumplimentado_1?.trim() && documento.estudiante_cumplimentado_1.trim() !== uvus)
      || (estado === 'ACEPTADA' && documento.estudiante_cumplimentado_1?.trim() === uvus)) {
      throw Object.assign(new Error('No puedes realizar esta firma del documento.'), { statusCode: 403 });
    }
    if (documento.estado === estado) {
      await conexion.query('COMMIT');
      return { participantes, cambiado: false };
    }
    const transicion = transiciones[estado];
    if (!transicion || documento.estado !== transicion.previo) {
      throw Object.assign(new Error('El documento no está en el estado necesario.'), { statusCode: 409 });
    }
    if (estado === 'FIRMADA' || estado === 'ACEPTADA') {
      await exigirArchivoPropio(conexion, 'archivador', archivo, uvus);
    }
    await conexion.query({
      text: `UPDATE permutas SET estado = $2, archivo = COALESCE($3, archivo),
        estudiante_cumplimentado_1 = CASE WHEN $2 = 'FIRMADA' THEN $4 ELSE estudiante_cumplimentado_1 END,
        estudiante_cumplimentado_2 = CASE WHEN $2 = 'ACEPTADA' THEN $4 ELSE estudiante_cumplimentado_2 END
        WHERE id = $1`,
      values: [id, estado, archivo ?? null, uvus ?? null],
    });
    await eventosNotificacion.registrar(conexion, { origen: 'documento', ids: [id], evento: estado,
      contenido: `Documento #${id}: ${transicion.contenido}` });
    await conexion.query('COMMIT');
    return { participantes, cambiado: true };
  } catch (error) {
    await conexion.query('ROLLBACK');
    throw error;
  } finally {
    await conexion.end();
  }
}
