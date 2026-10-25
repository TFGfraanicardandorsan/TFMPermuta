export function validarIdsDocumento(ids, uvus) {
  if (!uvus || !Array.isArray(ids) || ids.length < 1 || ids.length > 100
    || ids.some(id => !Number.isInteger(id) || id <= 0 || id > 2147483647)
    || new Set(ids).size !== ids.length) {
    throw Object.assign(new Error('Selecciona entre 1 y 100 permutas distintas.'), { statusCode: 400 });
  }
}

export async function autorizarNuevoDocumento(db, ids, uvus) {
  validarIdsDocumento(ids, uvus);
  const { rows } = await db.query({
    text: `SELECT p.id, p.usuario_id_1_fk, p.usuario_id_2_fk, p.estado, p.vigente,
      (u.id IS NOT NULL) AS pertenece,
      EXISTS (SELECT 1 FROM permutas_permuta pp JOIN permutas d ON d.id = pp.permutas_id_fk
        WHERE pp.permuta_id_fk = p.id AND d.vigente = true) AS tiene_documento
      FROM permuta p LEFT JOIN usuario u ON u.nombre_usuario = $2
        AND u.activo = true AND u.id IN (p.usuario_id_1_fk, p.usuario_id_2_fk)
      WHERE p.id = ANY($1::int[]) FOR UPDATE OF p`,
    values: [ids, uvus],
  });
  if (rows.length !== ids.length || rows.some(row => !row.pertenece)) {
    throw Object.assign(new Error('No participas en todas las permutas seleccionadas.'), { statusCode: 403 });
  }
  const parejas = new Set(rows.map(row => [row.usuario_id_1_fk, row.usuario_id_2_fk].sort((a, b) => a - b).join(':')));
  if (parejas.size !== 1 || rows.some(row => !row.vigente || row.estado !== 'VALIDADA' || row.tiene_documento)) {
    throw Object.assign(new Error('Las permutas deben estar validadas, ser de la misma pareja y no tener documento vigente.'), { statusCode: 409 });
  }
}
