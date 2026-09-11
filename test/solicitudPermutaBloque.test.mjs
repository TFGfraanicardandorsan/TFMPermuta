import test from 'node:test';
import assert from 'node:assert/strict';
import database from '../src/config/database.mjs';
import servicio from '../src/services/solicitudPermutaService.mjs';
import controlador from '../src/controllers/solicitudPermutaController.mjs';
import routes from '../src/routes/solicitudPermutaRoutes.mjs';
import { comprobarBloquesCompletos } from '../src/services/permutaBloqueService.mjs';

const texto = q => typeof q === 'string' ? q : q.text;
const originalConnect = database.connectPostgreSQL;
const originalNotificar = servicio.notificarSolicitud;
test.afterEach(() => {
  database.connectPostgreSQL = originalConnect;
  servicio.notificarSolicitud = originalNotificar;
});

const usarCliente = resolver => {
  const consultas = [];
  let cerrado = false;
  const client = {
    async query(q) {
      consultas.push(q);
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(q) || /pg_advisory_xact_lock/.test(texto(q))) return { rows: [] };
      const resultado = await resolver(q);
      assert.ok(resultado, `Consulta inesperada: ${texto(q)}`);
      return resultado;
    },
    async end() { cerrado = true; },
  };
  database.connectPostgreSQL = async () => client;
  return { client, consultas, estaCerrado: () => cerrado };
};

const cuerpo = (en_bloque = true) => ({ curso: 'PRIMERO', en_bloque, solicitudes: [
  { asignatura: 1001, grupos_deseados: [2] },
  { asignatura: 1002, grupos_deseados: [3] },
] });

const clienteCreacion = ({ falloSegunda = false, conflicto = false } = {}) => {
  let id = 0;
  return usarCliente(q => {
    const t = texto(q);
    if (/SELECT a.codigo FROM usuario_asignatura/.test(t)) return { rows: [{ codigo: 1001 }, { codigo: 1002 }] };
    if (/FROM usuario u/.test(t)) return { rows: [{ usuario_id: 1, asignatura_id: q.values[1],
      asignatura: 'Asignatura', grupo_solicitante_id: 10, grupo_solicitante: '1' }] };
    if (/FROM solicitud_permuta/.test(t)) return { rows: conflicto ? [{}] : [] };
    if (/FROM permuta p/.test(t)) return { rows: [] };
    if (/FROM grupo/.test(t)) return { rows: falloSegunda && id === 1 ? [] : [{ id: 20 + id, nombre: '2' }] };
    if (/INSERT INTO solicitud_permuta/.test(t)) return { rows: [{ id: ++id }] };
    if (/INSERT INTO grupo_deseado/.test(t)) return { rows: [], rowCount: 1 };
  });
};

test('crear un curso en bloque persiste un UUID común y notifica después del commit', async () => {
  const fake = clienteCreacion();
  let notificaciones = 0;
  servicio.notificarSolicitud = async () => {
    assert.equal(fake.consultas.at(-1), 'COMMIT');
    notificaciones++;
  };
  const result = await servicio.solicitarPermutaCurso('alumno', cuerpo());
  assert.equal(result.en_bloque, true);
  assert.equal(result.curso, 'PRIMERO');
  assert.deepEqual(result.solicitudes_ids, [1, 2]);
  assert.match(result.bloque_id, /^[0-9a-f-]{36}$/);
  const inserts = fake.consultas.filter(q => /INSERT INTO solicitud_permuta/.test(texto(q)));
  assert.deepEqual(inserts.map(q => q.values[3]), [result.bloque_id, result.bloque_id]);
  assert.equal(notificaciones, 2);
  assert.equal(fake.estaCerrado(), true);
});

test('sin bloque se puede solicitar solo una asignatura matriculada', async () => {
  const fake = clienteCreacion();
  servicio.notificarSolicitud = async () => {};
  const datos = cuerpo(false);
  datos.solicitudes.pop();
  const result = await servicio.solicitarPermutaCurso('alumno', datos);
  assert.equal(result.bloque_id, null);
  assert.deepEqual(result.solicitudes_ids, [1]);
  assert.equal(fake.consultas.at(-1), 'COMMIT');
});

for (const caso of ['falta asignatura', 'otra asignatura', 'duplicada', 'booleano inválido', 'curso inválido']) {
  test(`rechaza ${caso} sin guardar solicitudes`, async () => {
    const fake = clienteCreacion();
    const datos = cuerpo();
    if (caso === 'falta asignatura') datos.solicitudes.pop();
    if (caso === 'otra asignatura') datos.solicitudes[1].asignatura = 1003;
    if (caso === 'duplicada') datos.solicitudes[1].asignatura = 1001;
    if (caso === 'booleano inválido') datos.en_bloque = 'true';
    if (caso === 'curso inválido') datos.curso = 1;
    await assert.rejects(servicio.solicitarPermutaCurso('alumno', datos), e => e.statusCode === 400);
    assert.equal(fake.consultas.some(q => /INSERT/.test(texto(q))), false);
    assert.equal(fake.consultas.includes('COMMIT'), false);
  });
}

test('error en la segunda asignatura deshace todo y no notifica', async () => {
  const fake = clienteCreacion({ falloSegunda: true });
  servicio.notificarSolicitud = async () => assert.fail('No debe notificar');
  await assert.rejects(servicio.solicitarPermutaCurso('alumno', cuerpo()), e => e.statusCode === 400);
  assert.equal(fake.consultas.filter(q => /INSERT INTO solicitud_permuta/.test(texto(q))).length, 1);
  assert.equal(fake.consultas.at(-1), 'ROLLBACK');
  assert.equal(fake.estaCerrado(), true);
});

test('no incorpora solicitudes individuales existentes de forma silenciosa', async () => {
  const fake = clienteCreacion({ conflicto: true });
  await assert.rejects(servicio.solicitarPermutaCurso('alumno', cuerpo()), e => e.statusCode === 409);
  assert.equal(fake.consultas.at(-1), 'ROLLBACK');
});

const propuestas = [10, 11].map(id => ({ id, usuario_id_1_fk: 1, usuario_id_2_fk: 2, estado: 'PROPUESTA', vigente: true }));
for (const aceptar of [true, false]) {
  test(`${aceptar ? 'aceptar' : 'rechazar'} un miembro afecta a todo el bloque`, async () => {
    const fake = usarCliente(q => {
      if (/SELECT p.id, p.bloque_id/.test(texto(q))) return { rows: [{ id: 10, bloque_id: 'bloque', usuario_id: 2 }] };
      if (/SELECT id, usuario_id_1_fk/.test(texto(q))) return { rows: propuestas };
      if (/UPDATE permuta/.test(texto(q))) return { rows: [], rowCount: 2 };
    });
    await servicio.responderPermutaPropuesta('alumno', 10, aceptar);
    const update = fake.consultas.find(q => /UPDATE permuta/.test(texto(q)));
    assert.deepEqual(update.values[0], [10, 11]);
    if (aceptar) {
      assert.equal(update.values[1], 2);
      assert.match(update.text, /aceptada_1 OR usuario_id_1_fk = \$2/);
      assert.match(update.text, /aceptada_2 OR usuario_id_2_fk = \$2/);
    }
    assert.equal(fake.consultas.at(-1), 'COMMIT');
  });
}

test('una propuesta ajena o un bloque parcialmente inactivo no puede responderse', async () => {
  for (const ajena of [true, false]) {
    const fake = usarCliente(q => {
      if (/SELECT p.id, p.bloque_id/.test(texto(q))) return { rows: ajena ? [] : [{ id: 10, bloque_id: 'bloque', usuario_id: 1 }] };
      if (/SELECT id, usuario_id_1_fk/.test(texto(q))) return { rows: [propuestas[0], { ...propuestas[1], vigente: false }] };
    });
    await assert.rejects(servicio.aceptarPermutaPropuesta('alumno', 10), e => e.statusCode === 409);
    assert.equal(fake.consultas.some(q => /UPDATE permuta SET/.test(texto(q))), false);
    assert.equal(fake.consultas.at(-1), 'ROLLBACK');
  }
});

test('cancelar una solicitud cancela todos sus miembros', async () => {
  const fake = usarCliente(q => {
    if (/JOIN usuario u/.test(texto(q))) return { rows: [{ bloque_id: 'bloque', usuario_id_fk: 1,
      id_asignatura_fk: 1001, estado: 'SOLICITADA', vigente: true, nombre_usuario: 'alumno' }] };
    if (/SELECT id, id_asignatura_fk/.test(texto(q))) return { rows: [1, 2].map(id => ({
      id, id_asignatura_fk: 1000 + id, estado: 'SOLICITADA', vigente: true })) };
    if (/FROM permuta p/.test(texto(q))) { assert.deepEqual(q.values[0], [1001, 1002]); return { rows: [] }; }
    if (/UPDATE solicitud_permuta/.test(texto(q))) { assert.deepEqual(q.values, [[1, 2]]); return { rows: [], rowCount: 2 }; }
  });
  await servicio.cancelarSolicitudPermuta('alumno', 1);
  assert.equal(fake.consultas.at(-1), 'COMMIT');
});

test('el flujo manual no acepta una solicitud en bloque', async () => {
  const fake = usarCliente(q => /FROM solicitud_permuta sp/.test(texto(q)) ? { rows: [{ bloque_id: 'bloque' }] } : undefined);
  await assert.rejects(servicio.aceptarSolicitudPermuta('alumno', 1), e => e.statusCode === 409);
  assert.equal(fake.consultas.at(-1), 'ROLLBACK');
});

test('un documento parcial se rechaza aunque el frontend envíe solo un ID', async () => {
  await assert.rejects(comprobarBloquesCompletos({ query: async () => ({ rows: [{ id: 11 }] }) }, [10]), e => e.statusCode === 409);
  await comprobarBloquesCompletos({ query: async () => ({ rows: [] }) }, [10, 11]);
});

test('las rutas exigen rol y la creación requiere sesión', async () => {
  for (const ruta of ['/cursos', '/solicitarPermutaCurso']) {
    assert.equal(routes.stack.find(r => r.route?.path === ruta).route.stack.length, 2);
  }
  const res = { status(c) { this.codigo = c; return this; }, json(c) { this.body = c; return this; } };
  await controlador.solicitarPermutaCurso({ session: {}, body: cuerpo() }, res);
  assert.equal(res.codigo, 401);
});

test('el listado conserva todos los cursos y códigos de matrícula', async () => {
  usarCliente(() => ({ rows: [
    { curso: 'PRIMERO', codigo_asignatura: 1001, nombre_asignatura: 'A' },
    { curso: 'SEGUNDO', codigo_asignatura: 2001, nombre_asignatura: 'B' },
  ] }));
  const result = await servicio.getCursosPermuta('alumno');
  assert.deepEqual(result.map(c => c.curso), ['PRIMERO', 'SEGUNDO']);
  assert.equal(result[1].asignaturas[0].codigo_asignatura, 2001);
});

test('proponer guarda el bloque completo y revierte si falta un INSERT', async () => {
  const filas = [10, 11].flatMap(asignatura => [
    { estudiante_id: 1, asignatura, curso: 'PRIMERO', bloque_id: 'bloque', asignaturas_bloque: [10, 11], grupo_actual: 100 + asignatura, grupo_deseado: 200 + asignatura },
    { estudiante_id: 2, asignatura, curso: 'PRIMERO', bloque_id: null, grupo_actual: 200 + asignatura, grupo_deseado: 100 + asignatura },
  ]);
  for (const fallo of [false, true]) {
    let insertados = 0;
    const fake = usarCliente(q => {
      if (/SELECT DISTINCT sp.usuario_id_fk/.test(texto(q))) return { rows: filas };
      if (/INSERT INTO permuta/.test(texto(q))) return { rows: [], rowCount: fallo && ++insertados === 2 ? 0 : 1 };
    });
    if (fallo) {
      await assert.rejects(servicio.proponerPermutas(), e => e.statusCode === 409);
      assert.equal(fake.consultas.at(-1), 'ROLLBACK');
    } else {
      assert.equal((await servicio.proponerPermutas()).propuestasCreadas, 2);
      const ids = fake.consultas.filter(q => /INSERT INTO permuta/.test(texto(q))).map(q => q.values[3]);
      assert.ok(ids[0]);
      assert.equal(ids[0], ids[1]);
      assert.equal(fake.consultas.at(-1), 'COMMIT');
    }
  }
});
