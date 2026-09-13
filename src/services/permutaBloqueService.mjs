import eventosNotificacion from './eventosNotificacionService.mjs';
import database from '../config/database.mjs';

// Los documentos deben contener todos los miembros de cualquier bloque incluido.
export async function comprobarBloquesCompletos(conexion, ids) {
  const { rows } = await conexion.query({
    text: `SELECT p.id FROM permuta p
      WHERE p.bloque_id IN (SELECT bloque_id FROM permuta WHERE id = ANY($1::int[]))
        AND NOT (p.id = ANY($1::int[]))`,
    values: [ids],
  });
  if (rows.length) {
    const error = new Error('El documento debe incluir todas las permutas del bloque.');
    error.statusCode = 409;
    throw error;
  }
}

// El flujo manual anterior solo opera sobre permutas individuales.
export async function rechazarPermutaIndividual(uvus, id) {
  const conexion = await database.connectPostgreSQL();
  try {
    await conexion.query('BEGIN');
    const { rowCount } = await conexion.query({
      text: `UPDATE permuta SET estado = 'RECHAZADA' WHERE id = $1
        AND bloque_id IS NULL AND vigente = true AND estado = 'ACEPTADA'
        AND usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)`,
      values: [id, uvus],
    });
    if (!rowCount) {
      const error = new Error('La permuta no está disponible. Los bloques se responden desde propuestas del sistema.');
      error.statusCode = 409;
      throw error;
    }
    await eventosNotificacion.registrar(conexion, { origen: 'permuta', ids: [id], evento: 'rechazada',
      contenido: 'La permuta ha sido rechazada.' });
    await conexion.query('COMMIT');
    return 'Solicitud de permuta rechazada.';
  } catch (error) {
    await conexion.query('ROLLBACK');
    throw error;
  } finally {
    await conexion.end();
  }
}
