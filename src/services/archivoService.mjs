import database from '../config/database.mjs';

export const FILE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png)$/i;
const denied = () => Object.assign(new Error('Archivo no disponible.'), { statusCode: 404 });

export async function registrarArchivo(tipo, nombre, uvus) {
  const db = await database.connectPostgreSQL();
  try {
    await db.query({
      text: `INSERT INTO archivo_subido (tipo, nombre, propietario_id)
        VALUES ($1, $2, (SELECT id FROM usuario WHERE nombre_usuario = $3 AND activo = true))`,
      values: [tipo, nombre, uvus],
    });
  } finally { await db.end(); }
}

export async function exigirArchivoPropio(db, tipo, nombre, uvus) {
  if (!FILE_ID_RE.test(nombre || '')) throw denied();
  const { rows } = await db.query({
    text: `SELECT 1 FROM archivo_subido a JOIN usuario u ON u.id = a.propietario_id
      WHERE a.tipo = $1 AND a.nombre = $2 AND u.nombre_usuario = $3 AND u.activo = true`,
    values: [tipo, nombre, uvus],
  });
  if (!rows.length) throw denied();
}

export async function puedeLeerArchivo(tipo, nombre, user) {
  if (!FILE_ID_RE.test(nombre || '')) return false;
  if (user.rol === 'administrador') return true;
  const db = await database.connectPostgreSQL();
  try {
    const { rows } = await db.query({
      text: `SELECT 1 FROM usuario u WHERE u.nombre_usuario = $3 AND u.activo = true AND (
        EXISTS (SELECT 1 FROM archivo_subido a WHERE a.tipo = $1 AND a.nombre = $2 AND a.propietario_id = u.id)
        OR ($1 = 'archivador' AND EXISTS (
          SELECT 1 FROM permutas d JOIN permutas_permuta pp ON pp.permutas_id_fk = d.id
          JOIN permuta p ON p.id = pp.permuta_id_fk
          WHERE d.archivo = $2 AND u.id IN (p.usuario_id_1_fk, p.usuario_id_2_fk)))
        OR ($1 = 'buzon' AND EXISTS (
          SELECT 1 FROM incidencia i JOIN incidencia_usuario iu ON iu.id = i.id
          WHERE i.archivo = $2 AND u.id IN (iu.usuario_id_fk, iu.usuario_id_mantenimiento_fk)))
      )`,
      values: [tipo, nombre, user.nombre_usuario],
    });
    return rows.length > 0;
  } finally { await db.end(); }
}
