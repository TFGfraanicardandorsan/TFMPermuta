import test from 'node:test';
import assert from 'node:assert/strict';
import database from '../src/config/database.mjs';
import notificaciones from '../src/services/notificacionService.mjs';
import eventos from '../src/services/eventosNotificacionService.mjs';
import controller from '../src/controllers/notificacionController.mjs';
import { cambiarEstadoDocumento } from '../src/services/documentoPermutaEstadoService.mjs';
import solicitudes from '../src/services/solicitudPermutaService.mjs';

const original = database.connectPostgreSQL;
const text = q => typeof q === 'string' ? q : q.text;
test.afterEach(() => { database.connectPostgreSQL = original; });
const cliente = resolver => {
  const consultas = [];
  let cerrado = false;
  const client = { async query(q) {
    consultas.push(q);
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(q) || /pg_advisory_xact_lock/.test(text(q))) return { rows: [] };
    const result = await resolver(q);
    assert.ok(result, `Consulta inesperada: ${text(q)}`);
    return result;
  }, async end() { cerrado = true; } };
  database.connectPostgreSQL = async () => client;
  return { client, consultas, cerrado: () => cerrado };
};

test('el listado separa destinatarios privados y roles, admite varios roles y ordena por lectura', async () => {
  const fake = cliente(() => ({ rows: [] }));
  await notificaciones.getNotificacionesUsuario('alumno');
  const q = fake.consultas[0];
  assert.deepEqual(q.values, ['alumno']);
  assert.match(q.text, /n.destinatario_id_fk = u.id OR \(n.destinatario_id_fk IS NULL/);
  assert.match(q.text, /EXISTS \(SELECT 1 FROM roles/);
  assert.match(q.text, /l.usuario_id_fk = u.id/);
  assert.match(q.text, /fecha_expiracion >= NOW\(\)/);
  assert.match(q.text, /ORDER BY COALESCE\(l.leida, false\) ASC, n.fecha_creacion DESC/);
  assert.equal(fake.cerrado(), true);
});

test('la lectura pertenece al usuario autenticado y es idempotente', async () => {
  const fake = cliente(() => ({ rows: [{ id: 7, leida: true, fecha_lectura: 'fecha' }] }));
  assert.equal((await notificaciones.marcarLectura('alumno', 7, true)).leida, true);
  const q = fake.consultas[0];
  assert.deepEqual(q.values, ['alumno', 7, true]);
  assert.match(q.text, /ON CONFLICT \(notificacion_id_fk, usuario_id_fk\) DO UPDATE/);
  assert.match(q.text, /COALESCE\(notificacion_lectura.fecha_lectura, EXCLUDED.fecha_lectura\)/);
  assert.match(q.text, /n.destinatario_id_fk = u.id OR \(n.destinatario_id_fk IS NULL/);
});

test('no se puede marcar una notificación ajena o expirada', async () => {
  const fake = cliente(() => ({ rows: [] }));
  await assert.rejects(notificaciones.marcarLectura('ajeno', 7, true), e => e.statusCode === 404);
  assert.equal(fake.cerrado(), true);
});

test('marcar todas usa la misma visibilidad y desmarcar borra la fecha de lectura', async () => {
  const fake = cliente(() => ({ rows: [{ id: 7 }] }));
  assert.deepEqual(await notificaciones.marcarLectura('alumno', null, true), { actualizadas: 1 });
  assert.deepEqual(fake.consultas[0].values, ['alumno', null, true]);
  await notificaciones.marcarLectura('alumno', 7, false);
  assert.deepEqual(fake.consultas[1].values, ['alumno', 7, false]);
  assert.match(fake.consultas[1].text, /ELSE NULL END/);
});

test('rechaza IDs y flags inválidos antes de abrir una conexión', async () => {
  database.connectPostgreSQL = async () => assert.fail('No debe acceder a BD');
  for (const [id, flag] of [[-1, true], [0, true], [7, 'true'], [2147483648, true], [NaN, true]]) {
    await assert.rejects(notificaciones.marcarLectura('alumno', id, flag), e => e.statusCode === 400);
  }
});

test('el controlador exige sesión y no toma el usuario enviado en el body', async () => {
  const res = () => ({ status(c) { this.code = c; return this; }, json(body) { this.body = body; return this; } });
  const sinSesion = res();
  await controller.cambiarLectura({ session: {}, params: { id: '7' }, body: { leida: true } }, sinSesion);
  assert.equal(sinSesion.code, 401);
  const fake = cliente(() => ({ rows: [{ id: 7, leida: true }] }));
  await controller.cambiarLectura({ session: { user: { nombre_usuario: 'real' } }, params: { id: '7' },
    body: { leida: true, uvus: 'otra-persona' } }, res());
  assert.equal(fake.consultas[0].values[0], 'real');
});

test('los eventos de documentos incluyen solo participantes de ese documento, sin requerir Telegram', async () => {
  const fake = cliente(() => ({ rows: [], rowCount: 2 }));
  await eventos.registrar(fake.client, { origen: 'documento', ids: [42], evento: 'FIRMADA', contenido: 'Firma pendiente' });
  const q = fake.consultas[0];
  assert.match(q.text, /pp.permutas_id_fk = ANY\(\$1::int\[\]\)/);
  assert.match(q.text, /usuario_id_1_fk/);
  assert.match(q.text, /usuario_id_2_fk/);
  assert.doesNotMatch(q.text, /chatid|roles/);
  assert.deepEqual(q.values, [[42], 'Firma pendiente', 'DOCUMENTO', '/permutasAceptadas', 'documento:42:FIRMADA']);
});

test('un evento de bloque tiene una sola clave por destinatario aunque incluya varias asignaturas', async () => {
  const fake = cliente(() => ({ rows: [], rowCount: 1 }));
  for (const id of [1, 2]) await eventos.registrar(fake.client, { origen: 'permuta', ids: [id], referencia: 'bloque', evento: 'propuesta', contenido: 'Propuesta' });
  assert.equal(fake.consultas[0].values[4], fake.consultas[1].values[4]);
  assert.match(fake.consultas[0].text, /ON CONFLICT \(clave_evento, destinatario_id_fk\) DO NOTHING/);
});

const clienteDocumento = ({ previo = 'BORRADOR', falloAviso = false } = {}) => cliente(q => {
  const t = text(q);
  if (/SELECT \* FROM permutas/.test(t)) return { rows: [{ id: 42, estado: previo, estudiante_cumplimentado_1: 'primero' }] };
  if (/SELECT DISTINCT u.nombre_usuario/.test(t)) return { rows: [{ nombre_usuario: 'primero' }, { nombre_usuario: 'segundo' }] };
  if (/FROM archivo_subido/.test(t)) return { rows: [{ permitido: 1 }] };
  if (/UPDATE permutas/.test(t)) return { rows: [], rowCount: 1 };
  if (/INSERT INTO notificacion/.test(t)) {
    if (falloAviso) throw new Error('Fallo de persistencia del aviso');
    return { rows: [], rowCount: 2 };
  }
});

for (const [previo, estado, uvus] of [['BORRADOR', 'FIRMADA', 'primero'], ['FIRMADA', 'ACEPTADA', 'segundo'], ['ACEPTADA', 'VALIDADA', 'primero']]) {
  test(`la transición ${previo} → ${estado} y su aviso se confirman juntos`, async () => {
    const fake = clienteDocumento({ previo });
    const result = await cambiarEstadoDocumento(42, estado, { uvus, archivo: '12345678-1234-1234-1234-123456789abc.pdf' });
    assert.deepEqual(result.participantes, ['primero', 'segundo']);
    assert.equal(result.cambiado, true);
    assert.match(text(fake.consultas.at(-2)), /INSERT INTO notificacion/);
    assert.equal(fake.consultas.at(-1), 'COMMIT');
  });
}

test('un reintento de firma no crea otro evento ni modifica el documento', async () => {
  const fake = clienteDocumento({ previo: 'FIRMADA' });
  assert.equal((await cambiarEstadoDocumento(42, 'FIRMADA', { uvus: 'primero' })).cambiado, false);
  assert.equal(fake.consultas.some(q => /UPDATE permutas|INSERT INTO notificacion/.test(text(q))), false);
});

test('si no se puede guardar el aviso, la firma se revierte', async () => {
  const fake = clienteDocumento({ falloAviso: true });
  await assert.rejects(cambiarEstadoDocumento(42, 'FIRMADA', { uvus: 'primero', archivo: '12345678-1234-1234-1234-123456789abc.pdf' }), /Fallo de persistencia/);
  assert.equal(fake.consultas.at(-1), 'ROLLBACK');
  assert.equal(fake.consultas.includes('COMMIT'), false);
});

test('un tercero o el primer firmante no pueden hacer la segunda firma', async () => {
  for (const uvus of ['ajeno', 'primero']) {
    const fake = clienteDocumento({ previo: 'FIRMADA' });
    await assert.rejects(cambiarEstadoDocumento(42, 'ACEPTADA', { uvus }), e => e.statusCode === 403);
    assert.equal(fake.consultas.some(q => /INSERT INTO notificacion/.test(text(q))), false);
    assert.equal(fake.consultas.at(-1), 'ROLLBACK');
  }
});

test('la confirmación del último participante genera el aviso de validación del bloque', async () => {
  const fake = cliente(q => {
    const t = text(q);
    if (/SELECT p.id, p.bloque_id/.test(t)) return { rows: [{ id: 1, bloque_id: 'bloque', usuario_id: 2 }] };
    if (/SELECT id, usuario_id_1_fk/.test(t)) return { rows: [1, 2].map(id => ({ id, usuario_id_1_fk: 1,
      usuario_id_2_fk: 2, aceptada_1: true, aceptada_2: false, vigente: true, estado: 'PROPUESTA' })) };
    if (/UPDATE permuta SET|INSERT INTO notificacion/.test(t)) return { rows: [], rowCount: 2 };
  });
  await solicitudes.aceptarPermutaPropuesta('segundo', 1);
  const aviso = fake.consultas.find(q => /INSERT INTO notificacion/.test(text(q)));
  assert.deepEqual(aviso.values[0], [1, 2]);
  assert.equal(aviso.values[4], 'permuta:bloque:validada');
  assert.equal(fake.consultas.at(-1), 'COMMIT');
});
