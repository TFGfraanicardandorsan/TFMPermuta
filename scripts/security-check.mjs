import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { securityConfig } from '../src/config/security.mjs';
import { ssoConfig } from '../src/config/sso.mjs';
import { loadTlsOptions } from '../src/config/tls.mjs';
import database from '../src/config/database.mjs';

let failed = false;
async function check(label, action) {
  try { await action(); console.log(`OK: ${label}`); }
  catch (error) { failed = true; console.error(`ERROR: ${label}: ${error.message}`); }
}

await check('Node.js con correcciones de octubre de 2026', () => {
  const [major, minor, patch] = process.versions.node.split('.').map(Number);
  const minimum = new Map([[22, [23, 4]], [24, [22, 1]], [26, [12, 1]]]).get(major);
  if (!minimum || minor < minimum[0] || (minor === minimum[0] && patch < minimum[1])) {
    throw new Error('Instala Node 22 >=22.23.4, 24 >=24.22.1 o 26 >=26.12.1; revisa futuras actualizaciones.');
  }
});
await check('Sesiones, CORS, proxy y webhook', () => securityConfig());
await check('URLs de SSO', () => ssoConfig());
await check('Certificado y clave TLS nueva fuera del repositorio', () => loadTlsOptions());
await check('Directorios privados y separados', () => {
  const names = ['BUZON', 'ARCHIVADOR', 'PROYECTO_DOCENTE', 'PLANTILLAS', 'DELEGADOS_CERTIFICADOS_DIR'];
  const directories = names.map(name => {
    if (!process.env[name] || !path.isAbsolute(process.env[name])) throw new Error(`Falta ruta absoluta ${name}.`);
    const dir = fs.realpathSync(process.env[name]);
    if (!fs.statSync(dir).isDirectory()) throw new Error(`${name} no es un directorio.`);
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
    if (process.platform !== 'win32' && (fs.statSync(dir).mode & 0o007)) throw new Error(`${name} permite acceso a otros usuarios.`);
    return dir;
  });
  if (new Set(directories).size !== directories.length) throw new Error('Cada tipo de archivo necesita su propio directorio.');
});
await check('Permisos de .env', () => {
  if (fs.existsSync('.env') && process.platform !== 'win32' && (fs.statSync('.env').mode & 0o077)) {
    throw new Error('Ejecuta chmod 600 .env.');
  }
});
if (process.argv.includes('--database')) {
  await check('Migración y permisos de PostgreSQL', async () => {
    const db = await database.connectPostgreSQL();
    try {
      await db.query('SELECT sid, expire FROM web_session LIMIT 0');
      await db.query('SELECT tipo, nombre, propietario_id FROM archivo_subido LIMIT 0');
      const { rows } = await db.query('SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user');
      if (Object.values(rows[0] || {}).some(Boolean)) throw new Error('El rol de la aplicación tiene privilegios globales innecesarios.');
      const result = await db.query(`SELECT bool_and(has_table_privilege(current_user, table_name, privilege)) AS allowed
        FROM (VALUES ('web_session', 'SELECT'), ('web_session', 'INSERT'), ('web_session', 'UPDATE'),
          ('web_session', 'DELETE'), ('archivo_subido', 'SELECT'), ('archivo_subido', 'INSERT')) AS permissions(table_name, privilege)`);
      if (!result.rows[0].allowed) throw new Error('Faltan permisos de acceso a las tablas de seguridad.');
    } finally { await db.end(); }
  });
}
process.exitCode = failed ? 1 : 0;
