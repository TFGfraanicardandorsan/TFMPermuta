import test from 'node:test';
import assert from 'node:assert/strict';
import database from '../src/config/database.mjs';
import usuarioAsignaturaService from '../src/services/usuarioAsignaturaService.mjs';
import usuarioGrupoService from '../src/services/usuarioGrupoService.mjs';
import usuarioService from '../src/services/usuarioService.mjs';
import incidenciaService from '../src/services/incidenciaService.mjs';
import estudiosService from '../src/services/estudiosService.mjs';
import solicitudPermutaService from '../src/services/solicitudPermutaService.mjs';

const originalConnect = database.connectPostgreSQL;
const texto = (q) => typeof q === 'string' ? q : q.text;
test.afterEach(() => { database.connectPostgreSQL = originalConnect; });

// Cliente simulado: resolver(sql) devuelve el resultado o lanza; registra consultas y cierres.
const usarCliente = (resolver) => {
  const estado = { consultas: [], cierres: 0 };
  database.connectPostgreSQL = async () => ({
    async query(q) {
      const sql = texto(q);
      estado.consultas.push(sql);
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql) || /pg_advisory_xact_lock/.test(sql)) return { rows: [] };
      return resolver(sql, q);
    },
    async end() { estado.cierres += 1; },
  });
  return estado;
};

test('las consultas que lanzan cierran igualmente la conexión', async () => {
  const fallo = () => { throw new Error('fallo SQL'); };
  for (const llamada of [
    () => incidenciaService.obtenerIncidencias(),
    () => estudiosService.obtenerEstudios(),
    () => usuarioService.obtenerDatosUsuario('ana'),
    () => solicitudPermutaService.getMisSolicitudesPermuta('ana'),
    () => solicitudPermutaService.getSolicitudesPermutaInteresantes('ana'),
  ]) {
    const estado = usarCliente(fallo);
    await assert.rejects(llamada(), /fallo SQL/);
    assert.equal(estado.cierres, 1);
  }
});

test('actualizarAsignaturasUsuario serializa por usuario y confirma la transacción', async () => {
  const estado = usarCliente((sql) => {
    if (/select count\(\*\) from usuario_asignatura/.test(sql)) return { rows: [{ count: '0' }] };
    if (/insert into usuario_asignatura/.test(sql)) return { rows: [], rowCount: 1 };
    throw new Error(`Consulta inesperada: ${sql}`);
  });
  const res = await usuarioAsignaturaService.actualizarAsignaturasUsuario('ana', 2050001);
  assert.equal(res, 'Usuario insertado en la asignatura correctamente');
  assert.equal(estado.consultas[0], 'BEGIN');
  assert.match(estado.consultas[1], /pg_advisory_xact_lock\(hashtext\('usuario_asignatura'\)/);
  assert.equal(estado.consultas.at(-1), 'COMMIT');
  assert.equal(estado.cierres, 1);
});

test('actualizarAsignaturasUsuario no inserta si ya existe y cierra la conexión', async () => {
  const estado = usarCliente((sql) => {
    if (/select count/.test(sql)) return { rows: [{ count: '1' }] };
    throw new Error(`Consulta inesperada: ${sql}`);
  });
  assert.equal(await usuarioAsignaturaService.actualizarAsignaturasUsuario('ana', 1), 'El usuario ya está en la asignatura');
  assert.ok(!estado.consultas.some((sql) => /insert/i.test(sql)));
  assert.equal(estado.cierres, 1);
});

test('actualizarAsignaturasUsuario revierte si falla el INSERT y conserva el mensaje', async (t) => {
  t.mock.method(console, 'error', () => {});
  const estado = usarCliente((sql) => {
    if (/select count/.test(sql)) return { rows: [{ count: '0' }] };
    throw new Error('violación de clave');
  });
  assert.equal(await usuarioAsignaturaService.actualizarAsignaturasUsuario('ana', 1),
    'Se ha producido un error al insertar el usuario en la asignatura');
  assert.ok(estado.consultas.includes('ROLLBACK'));
  assert.ok(!estado.consultas.includes('COMMIT'));
  assert.equal(estado.cierres, 1);
});

test('insertarGrupoAsignatura serializa por usuario y no deja la conexión abierta si el SELECT falla', async () => {
  const ok = usarCliente((sql) => {
    if (/select count\(\*\) from usuario_grupo/.test(sql)) return { rows: [{ count: '1' }] };
    throw new Error(`Consulta inesperada: ${sql}`);
  });
  assert.equal(await usuarioGrupoService.insertarGrupoAsignatura('ana', '1', 2050001), 'El usuario ya está en el grupo');
  assert.match(ok.consultas[1], /pg_advisory_xact_lock\(hashtext\('usuario_grupo'\)/);
  assert.equal(ok.cierres, 1);

  const fallo = usarCliente(() => { throw new Error('caída'); });
  await assert.rejects(usuarioGrupoService.insertarGrupoAsignatura('ana', '1', 1), /caída/);
  assert.ok(fallo.consultas.includes('ROLLBACK'));
  assert.equal(fallo.cierres, 1);
});

test('actualizarEstudiosUsuario usa un UPDATE condicional atómico', async () => {
  let consulta;
  usarCliente((sql, q) => { consulta = q; return { rows: [], rowCount: 0 }; });
  const res = await usuarioService.actualizarEstudiosUsuario('ana', 'GII');
  assert.match(consulta.text, /estudios_id_fk is null/);
  assert.deepEqual(consulta.values, ['GII', 'ana']);
  assert.equal(res, 'Ya tienes estudios seleccionados. Ponte en contacto con el administrador si deseas cambiarlos');
});
