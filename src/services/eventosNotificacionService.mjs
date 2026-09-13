// Se ejecuta con la misma conexión/transacción que el cambio de negocio.
// Nunca se aceptan destinatarios ni enlaces proporcionados por el cliente.
const origenes = {
  solicitud: 'SELECT usuario_id_fk AS destinatario FROM solicitud_permuta WHERE id = ANY($1::int[])',
  permuta: `SELECT usuario_id_1_fk AS destinatario FROM permuta WHERE id = ANY($1::int[])
    UNION SELECT usuario_id_2_fk FROM permuta WHERE id = ANY($1::int[])`,
  documento: `SELECT p.usuario_id_1_fk AS destinatario FROM permuta p
    JOIN permutas_permuta pp ON pp.permuta_id_fk = p.id WHERE pp.permutas_id_fk = ANY($1::int[])
    UNION SELECT p.usuario_id_2_fk FROM permuta p
    JOIN permutas_permuta pp ON pp.permuta_id_fk = p.id WHERE pp.permutas_id_fk = ANY($1::int[])`,
  incidencia: 'SELECT usuario_id_fk AS destinatario FROM incidencia_usuario WHERE id = ANY($1::int[])',
};

const eventosNotificacion = {
  async registrar(conexion, { origen, ids, evento, contenido, referencia = ids.join('-') }) {
    if (!origenes[origen] || !ids.length) throw new Error('Origen de notificación inválido');
    const tipo = origen === 'documento' ? 'DOCUMENTO' : origen === 'incidencia' ? 'INCIDENCIA' : 'PERMUTA';
    const enlace = origen === 'documento' ? '/permutasAceptadas' : origen === 'incidencia' ? '/misIncidencias' : '/seguimiento';
    return conexion.query({
      text: `INSERT INTO notificacion (contenido, receptor, destinatario_id_fk, tipo, enlace, clave_evento)
        SELECT DISTINCT $2, 'personal', destinatario, $3, $4, $5
        FROM (${origenes[origen]}) participantes WHERE destinatario IS NOT NULL
        ON CONFLICT (clave_evento, destinatario_id_fk) DO NOTHING`,
      values: [ids, contenido, tipo, enlace, `${origen}:${referencia}:${evento}`],
    });
  },
};

export default eventosNotificacion;
