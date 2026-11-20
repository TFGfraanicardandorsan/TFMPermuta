import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import database from '../src/config/database.mjs';
import uploadRoutes from '../src/routes/uploadRoutes.mjs';
import { securityErrorHandler } from '../src/middleware/security.mjs';
import { puedeLeerArchivo, TIPO_DOCUMENTO_PERMUTA, TIPO_ADJUNTO_INCIDENCIA } from '../src/services/archivoService.mjs';

// El front sube los documentos de permuta con tipo 'buzon' (generacionPDF.jsx)
// y los adjuntos de incidencias con tipo 'archivador' (reportarIncidencia.jsx).
test('los tipos de archivo coinciden con los que usa el front', () => {
  assert.equal(TIPO_DOCUMENTO_PERMUTA, 'buzon');
  assert.equal(TIPO_ADJUNTO_INCIDENCIA, 'archivador');
});

test('la lectura asocia buzon a documentos de permuta y archivador a incidencias', async (t) => {
  let consulta;
  t.mock.method(database, 'connectPostgreSQL', async () => ({
    query: async (q) => { consulta = q; return { rows: [] }; }, end: async () => {},
  }));
  await puedeLeerArchivo('buzon', '0b5f3c6e-1d2a-4f7b-9c3d-2e1f0a9b8c7d.pdf', { nombre_usuario: 'ana', rol: 'estudiante' });
  assert.match(consulta.text, /\$1 = 'buzon' AND EXISTS \(\s*SELECT 1 FROM permutas d/);
  assert.match(consulta.text, /\$1 = 'archivador' AND EXISTS \(\s*SELECT 1 FROM incidencia i/);
});

test('las capturas PNG solo se aceptan como adjunto de incidencia', async (t) => {
  const dirs = { BUZON: await fs.mkdtemp(path.join(os.tmpdir(), 'buzon-')), ARCHIVADOR: await fs.mkdtemp(path.join(os.tmpdir(), 'archivador-')) };
  const anteriores = { BUZON: process.env.BUZON, ARCHIVADOR: process.env.ARCHIVADOR };
  Object.assign(process.env, dirs);
  t.after(async () => {
    for (const [k, v] of Object.entries(anteriores)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    await Promise.all(Object.values(dirs).map((d) => fs.rm(d, { recursive: true, force: true })));
  });
  t.mock.method(database, 'connectPostgreSQL', async () => ({ query: async () => ({ rows: [] }), end: async () => {} }));

  const app = express();
  app.use((req, _res, next) => { req.session = { user: { nombre_usuario: 'ana', rol: 'estudiante' } }; next(); });
  app.use('/api/v1', uploadRoutes);
  app.use(securityErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
  const subir = (tipo) => {
    const form = new FormData();
    form.append('tipo', tipo);
    form.append('file', new Blob([png], { type: 'image/png' }), 'captura.png');
    return fetch(`http://127.0.0.1:${server.address().port}/api/v1/upload`, { method: 'POST', body: form });
  };
  assert.equal((await subir('archivador')).status, 200);
  assert.equal((await subir('buzon')).status, 400);
});
