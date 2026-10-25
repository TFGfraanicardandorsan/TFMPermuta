import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import express from 'express';
import uploadRoutes from '../src/routes/uploadRoutes.mjs';
import uploadController from '../src/controllers/uploadController.mjs';
import { refreshSessionUser, verifyTelegramWebhook, securityErrorHandler } from '../src/middleware/security.mjs';
import { createCsrfProtection } from '../src/middleware/csrf.mjs';
import { securityConfig } from '../src/config/security.mjs';
import { ssoCookies } from '../src/config/sso.mjs';
import { verificarSesionUsuario } from '../src/controllers/autorizacionController.mjs';
import database from '../src/config/database.mjs';
import auth from '../src/services/autorizacionService.mjs';
import { handleCallbackQuery } from '../src/services/telegramService.mjs';
import { autorizarNuevoDocumento } from '../src/services/documentoAutorizacionService.mjs';
import permutas from '../src/services/permutaService.mjs';
import { exigirArchivoPropio, puedeLeerArchivo } from '../src/services/archivoService.mjs';
import { putExchange, popExchange } from '../src/services/delegadosAfirmaService.mjs';
import { buildEmailConfig } from '../src/services/delegadosEmailService.mjs';
import GenericValidators from '../src/utils/genericValidators.mjs';

const filename = '12345678-1234-1234-1234-123456789abc.pdf';
const response = () => ({ code: 200, status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; }, setHeader() {} });

test('webhook rechaza secretos ausentes, erróneos y configuración vacía', t => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;
  t.after(() => { if (original === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET; else process.env.TELEGRAM_WEBHOOK_SECRET = original; });
  process.env.TELEGRAM_WEBHOOK_SECRET = 'x'.repeat(48);
  for (const value of [undefined, '', 'x'.repeat(47), 'y'.repeat(48)]) {
    const res = response();
    verifyTelegramWebhook({ get: () => value }, res, () => assert.fail('No debe aceptar'));
    assert.equal(res.code, 403);
  }
  let called = false;
  verifyTelegramWebhook({ get: () => 'x'.repeat(48) }, response(), () => { called = true; });
  assert.equal(called, true);
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  const res = response();
  verifyTelegramWebhook({ get: () => '' }, res, () => assert.fail());
  assert.equal(res.code, 503);
});

test('callback de Telegram exige administrador activo aunque el chat sea el autorizado', async t => {
  const oldChat = process.env.ADMIN_CHAT_ID;
  process.env.ADMIN_CHAT_ID = '55';
  t.after(() => { if (oldChat === undefined) delete process.env.ADMIN_CHAT_ID; else process.env.ADMIN_CHAT_ID = oldChat; });
  t.mock.method(auth, 'verificarSiExisteUsuarioEnTelegram', async () => 'alumno');
  t.mock.method(auth, 'verificarSiExisteUsuario', async () => ({ rol: 'estudiante' }));
  const lookup = t.mock.method(auth, 'consultarSolicitudAltaUsuario', async () => assert.fail('No debe consultar altas'));
  await handleCallbackQuery({ from: { id: 55 }, message: { chat: { id: 55 } }, data: 'aceptar_victima' });
  assert.equal(lookup.mock.callCount(), 0);
});

test('la sesión pierde el rol anterior y se revoca si el usuario está inactivo', async t => {
  const req = { session: { user: { nombre_usuario: 'alumno', rol: 'administrador' }, destroy(cb) { cb(); } } };
  const lookup = t.mock.method(auth, 'verificarSiExisteUsuario', async () => ({ nombre_usuario: 'alumno', rol: 'estudiante' }));
  await refreshSessionUser(req, response(), () => {});
  assert.equal(req.session.user.rol, 'estudiante');
  lookup.mock.mockImplementation(async () => undefined);
  const res = response();
  await refreshSessionUser(req, res, () => assert.fail());
  assert.equal(res.code, 401);
});

test('CSRF rechaza Origin no permitido aunque falte Sec-Fetch-Site', () => {
  const req = { method: 'POST', path: '/upload', session: { csrfToken: 'token' },
    get: header => ({ Origin: 'https://evil.example', 'x-csrf-token': 'token' })[header] };
  const res = response();
  createCsrfProtection({ allowedOrigins: ['https://permutas.eii.us.es'] })(req, res, () => assert.fail());
  assert.equal(res.code, 403);
});

test('configuración de producción rechaza secreto corto, orígenes inseguros y proxy abierto', () => {
  const base = { SESSION_SECRET: 'a'.repeat(48), NODE_ENV: 'production', FRONTEND_ORIGINS: 'https://example.com' };
  for (const config of [{ ...base, SESSION_SECRET: 'short' }, { ...base, FRONTEND_ORIGINS: '*' },
    { ...base, FRONTEND_ORIGINS: 'http://example.com' }, { ...base, TRUST_PROXY: 'true' }]) {
    assert.throws(() => securityConfig(config));
  }
  assert.deepEqual(securityConfig(base).frontendOrigins, ['https://example.com']);
});

test('SSO reenvía solo cookies del SP y rechaza redirecciones sin crear sesión', async t => {
  assert.equal(ssoCookies('connect.sid=secret; SimpleSAMLSessionID=sso; unrelated=token'), 'SimpleSAMLSessionID=sso');
  let options;
  t.mock.method(globalThis, 'fetch', async (url, opts) => { options = opts; return new Response('', { status: 302 }); });
  const lookup = t.mock.method(auth, 'verificarSiExisteUsuario', async () => assert.fail());
  const res = response();
  await verificarSesionUsuario({ headers: { cookie: 'SimpleSAMLSessionID=sso; connect.sid=secret' }, session: {} }, res);
  assert.equal(options.redirect, 'manual');
  assert.equal(options.headers.Cookie, 'SimpleSAMLSessionID=sso');
  assert.equal(res.code, 401);
  assert.equal(lookup.mock.callCount(), 0);
});

test('borrador rechaza permutas ajenas, no validadas, con documento y de parejas distintas', async () => {
  const row = { id: 1, usuario_id_1_fk: 1, usuario_id_2_fk: 2, pertenece: true, estado: 'VALIDADA', vigente: true, tiene_documento: false };
  for (const [rows, status] of [[[ { ...row, pertenece: false } ], 403], [[{ ...row, estado: 'PROPUESTA' }], 409],
    [[{ ...row, tiene_documento: true }], 409], [[{ ...row, vigente: false }], 409], [[], 403]]) {
    await assert.rejects(autorizarNuevoDocumento({ query: async () => ({ rows }) }, [1], 'alumno'), e => e.statusCode === status);
  }
  await assert.rejects(autorizarNuevoDocumento({ query: async () => ({ rows: [row, { ...row, id: 2, usuario_id_2_fk: 3 }] }) }, [1, 2], 'alumno'), e => e.statusCode === 409);
  await autorizarNuevoDocumento({ query: async () => ({ rows: [row] }) }, [1], 'alumno');
});

test('un borrador ajeno revierte sin INSERT ni UPDATE', async t => {
  const queries = [];
  t.mock.method(database, 'connectPostgreSQL', async () => ({
    query: async q => { queries.push(q); return { rows: [] }; }, end: async () => {},
  }));
  t.mock.method(console, 'error', () => {});
  await assert.rejects(permutas.generarBorradorPermutas([1], 'ajeno'), e => e.statusCode === 403);
  assert.equal(queries.at(-1), 'ROLLBACK');
  assert.equal(queries.some(q => /INSERT|UPDATE permuta/.test(q.text || '')), false);
});

test('adjuntar un archivo ajeno o una ruta manipulada se rechaza', async () => {
  const db = { query: async () => ({ rows: [] }) };
  for (const name of [filename, '../secreto.pdf', '..\\secreto.pdf', 'archivo.pdf']) {
    await assert.rejects(exigirArchivoPropio(db, 'archivador', name, 'ajeno'), e => e.statusCode === 404);
  }
  await exigirArchivoPropio({ query: async () => ({ rows: [{}] }) }, 'archivador', filename, 'propietario');
});

test('la lectura de archivos comprueba la relación con el usuario', async t => {
  let query;
  t.mock.method(database, 'connectPostgreSQL', async () => ({ query: async q => { query = q; return { rows: [] }; }, end: async () => {} }));
  assert.equal(await puedeLeerArchivo('archivador', filename, { nombre_usuario: 'ajeno', rol: 'estudiante' }), false);
  assert.deepEqual(query.values, ['archivador', filename, 'ajeno']);
  assert.match(query.text, /u.id IN \(p.usuario_id_1_fk, p.usuario_id_2_fk\)/);
});

test('multipart real: sesión previa, roles, contenido, traversal y límite de archivos', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'permuta-security-'));
  const old = process.env.BUZON;
  process.env.BUZON = dir;
  t.after(async () => { if (old === undefined) delete process.env.BUZON; else process.env.BUZON = old; await fs.rm(dir, { recursive: true, force: true }); });
  const records = [];
  t.mock.method(database, 'connectPostgreSQL', async () => ({ query: async q => { records.push(q); return { rows: [{}] }; }, end: async () => {} }));
  const app = express();
  app.use((req, res, next) => { req.session = req.get('X-Test-Session') ? { user: { nombre_usuario: 'alumno', rol: 'estudiante' } } : {}; next(); });
  app.use('/api/v1', uploadRoutes);
  app.use(securityErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/upload`;
  async function submit({ session = true, tipo = 'buzon', content = '%PDF-1.7\n', extra = false } = {}) {
    const form = new FormData();
    form.append('tipo', tipo);
    form.append('file', new Blob([content], { type: 'application/pdf' }), 'example.pdf');
    if (extra) form.append('file', new Blob(['%PDF-1.7'], { type: 'application/pdf' }), 'other.pdf');
    return fetch(url, { method: 'POST', headers: session ? { 'X-Test-Session': 'yes' } : {}, body: form });
  }
  assert.equal((await submit({ session: false })).status, 401);
  assert.equal((await submit({ tipo: 'plantilla' })).status, 403);
  assert.equal((await submit({ content: '<script>alert(1)</script>' })).status, 400);
  assert.equal((await submit({ extra: true })).status, 400);
  assert.equal((await submit({ content: '%PDF-' + 'a'.repeat(12 * 1024 * 1024) })).status, 413);
  assert.deepEqual(await fs.readdir(dir), []);
  const saved = await submit();
  assert.equal(saved.status, 200);
  const result = await saved.json();
  assert.match(result.fileId, /^[a-f0-9-]{36}\.pdf$/);
  assert.equal(records.length, 1);
  assert.equal(records[0].values[2], 'alumno');
  const res = response();
  await uploadController.servirArchivo({ session: { user: { rol: 'administrador' } }, params: { tipo: 'buzon', fileId: '../secret.pdf' } }, res);
  assert.equal(res.code, 400);
});

test('AutoFirma aísla sesiones, consume una vez y limita memoria', () => {
  putExchange('same-id', 'secret-a', 'session-a');
  assert.equal(popExchange('same-id', 'session-b'), null);
  assert.equal(popExchange('same-id', 'session-a'), 'secret-a');
  assert.equal(popExchange('same-id', 'session-a'), null);
  assert.throws(() => putExchange('id', 'data', undefined));
  putExchange('large', 'a'.repeat(25 * 1024 * 1024), 'session-a');
  assert.throws(() => putExchange('overflow', 'extra', 'session-a'), e => e.statusCode === 429);
  popExchange('large', 'session-a');
});

test('SMTP rechaza hosts arbitrarios y puertos internos', () => {
  assert.ok(buildEmailConfig({ host: '127.0.0.1', port: 22, sender: 'test@example.com', password: 'x' }).errors.length);
});

test('los identificadores no aceptan prefijos numéricos ni coerción de objetos', () => {
  for (const input of ['12bad', '1.2', true, {}, [], '9007199254740993']) assert.equal(GenericValidators.isInteger(input).valido, false);
  assert.equal(GenericValidators.isInteger('12').valor, 12);
});
