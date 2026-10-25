import 'dotenv/config';
import fs from 'node:fs/promises';
import database from '../src/config/database.mjs';

const db = await database.connectPostgreSQL();
try {
  const sql = await fs.readFile(new URL('../sql/seguridad_sesiones_archivos.sql', import.meta.url), 'utf8');
  await db.query(sql);
  console.log('Migración de sesiones y archivos aplicada.');
} catch (error) {
  await db.query('ROLLBACK').catch(() => {});
  console.error('No se pudo aplicar la migración:', error.code || error.name);
  process.exitCode = 1;
} finally { await db.end(); }
