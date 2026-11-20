import test from 'node:test';
import assert from 'node:assert/strict';
import database from '../src/config/database.mjs';
import asignaturaService from '../src/services/asignaturaService.mjs';
import asignaturaController from '../src/controllers/asignaturaController.mjs';
import asignaturaRoutes from '../src/routes/asignaturaRoutes.mjs';

const originalConnect = database.connectPostgreSQL;
const texto = (consulta) => typeof consulta === 'string' ? consulta : consulta.text;

test.afterEach(() => { database.connectPostgreSQL = originalConnect; });

const usarCliente = (resolver) => {
  const consultas = [];
  const estado = { cerrado: false };
  database.connectPostgreSQL = async () => ({
    async query(consulta) {
      consultas.push(texto(consulta));
      const sql = texto(consulta);
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql) || /pg_advisory_xact_lock/.test(sql)) {
        return { rows: [] };
      }
      return resolver(sql, consulta);
    },
    async end() { estado.cerrado = true; },
  });
  return { consultas, estado };
};

const respuesta = () => ({
  status(codigo) { this.codigo = codigo; return this; },
  json(cuerpo) { this.cuerpo = cuerpo; return this; },
});

const cuerpoValido = { nombre: ' Cálculo ', siglas: 'cal', curso: 'PRIMERO', codigo: '2050001', estudios_id: 1 };
const sesionAdmin = { user: { rol: 'administrador', nombre_usuario: 'admin' } };

test('el panel de asignaturas sólo es accesible para administradores', () => {
  const capa = asignaturaRoutes.stack.find((c) => c.route?.path === '/admin/panel');
  assert.ok(capa, 'La ruta /admin/panel debe existir');
  const res = respuesta();
  capa.route.stack[0].handle({ session: { user: { rol: 'estudiante' } } }, res,
    () => assert.fail('No debe continuar'));
  assert.equal(res.codigo, 403);
});

test('el panel calcula el resumen a partir de las asignaturas', async () => {
  const { estado } = usarCliente(() => ({ rows: [
    { id: 1, codigo: 1, nombre: 'A', siglas: 'A', curso: 'PRIMERO', grados: [{ id: 1, nombre: 'GII' }], num_grupos: 3, matriculados: 10, solicitudes_vigentes: 2 },
    { id: 2, codigo: 2, nombre: 'B', siglas: 'B', curso: 'SEGUNDO', grados: [], num_grupos: 0, matriculados: 0, solicitudes_vigentes: 0 },
    { id: 3, codigo: 3, nombre: 'C', siglas: 'C', curso: 'TERCERO', grados: [{ id: 1, nombre: 'GII' }], num_grupos: 1, matriculados: 4, solicitudes_vigentes: 1 },
  ] }));
  const { resumen, asignaturas } = await asignaturaService.obtenerPanelAdmin();
  assert.equal(asignaturas.length, 3);
  assert.deepEqual(resumen, {
    total: 3, permutables: 1, sin_grupos: 1, sin_grado: 1, total_grupos: 4, solicitudes_vigentes: 3,
  });
  assert.ok(estado.cerrado);
});

test('crear asignatura inserta en transacción y normaliza los datos', async () => {
  const { consultas } = usarCliente((sql, consulta) => {
    if (/FROM estudios/.test(sql)) return { rows: [{ id: 1, nombre: 'GII' }] };
    if (/SELECT id FROM asignatura/.test(sql)) return { rows: [] };
    if (/INSERT INTO asignatura \(/.test(sql)) {
      assert.deepEqual(consulta.values, ['Cálculo', 'CAL', 'PRIMERO', 2050001]);
      return { rows: [{ id: 9, nombre: 'Cálculo', siglas: 'CAL', curso: 'PRIMERO', codigo: 2050001 }] };
    }
    if (/INSERT INTO asignatura_estudios/.test(sql)) return { rows: [] };
    throw new Error(`Consulta inesperada: ${sql}`);
  });
  const res = respuesta();
  await asignaturaController.crearAsignatura({ session: sesionAdmin, body: { ...cuerpoValido } }, res);
  assert.equal(res.codigo, 201);
  assert.equal(res.cuerpo.result.grados[0].nombre, 'GII');
  assert.equal(consultas[0], 'BEGIN');
  assert.equal(consultas.at(-1), 'COMMIT');
});

test('crear asignatura con código duplicado devuelve 409 y hace rollback', async () => {
  const { consultas, estado } = usarCliente((sql) => {
    if (/FROM estudios/.test(sql)) return { rows: [{ id: 1, nombre: 'GII' }] };
    if (/SELECT id FROM asignatura/.test(sql)) return { rows: [{ id: 3 }] };
    throw new Error(`Consulta inesperada: ${sql}`);
  });
  const res = respuesta();
  await asignaturaController.crearAsignatura({ session: sesionAdmin, body: { ...cuerpoValido } }, res);
  assert.equal(res.codigo, 409);
  assert.match(res.cuerpo.message, /2050001/);
  assert.ok(consultas.includes('ROLLBACK'));
  assert.ok(!consultas.some((sql) => /INSERT/.test(sql)));
  assert.ok(estado.cerrado);
});

test('crear asignatura rechaza códigos no numéricos estrictos', async () => {
  usarCliente(() => assert.fail('No debe consultar la base de datos'));
  const res = respuesta();
  await asignaturaController.crearAsignatura({ session: sesionAdmin, body: { ...cuerpoValido, codigo: '12abc' } }, res);
  assert.equal(res.codigo, 400);
});
