import test from 'node:test';
import assert from 'node:assert/strict';
import database from '../src/config/database.mjs';
import permutaService from '../src/services/permutaService.mjs';
import solicitudPermutaService from '../src/services/solicitudPermutaService.mjs';

const originalConnectPostgreSQL = database.connectPostgreSQL;
const originalConsoleError = console.error;

const crearCliente = (rows) => {
  const consultas = [];
  let cerrado = false;
  return {
    consultas,
    estaCerrado: () => cerrado,
    client: {
      async query(query) {
        consultas.push(query);
        return { rows };
      },
      async end() {
        cerrado = true;
      },
    },
  };
};

test.afterEach(() => {
  database.connectPostgreSQL = originalConnectPostgreSQL;
  console.error = originalConsoleError;
});

test('listarPermutas selecciona el documento común más reciente', async () => {
  const documento = { id: 42, estado: 'BORRADOR', archivo: null };
  const fake = crearCliente([documento]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await permutaService.listarPermutas([10, 11], 'alumno1');
  const query = fake.consultas[0];

  assert.deepEqual(resultado, [documento]);
  assert.deepEqual(query.values, [[10, 11], 'alumno1']);
  assert.match(query.text, /u.nombre_usuario = \$2/);
  assert.match(query.text, /HAVING COUNT\(DISTINCT pp\.permuta_id_fk\)/);
  assert.match(query.text, /ORDER BY ps\.id DESC\s+LIMIT 1/);
  assert.equal(fake.estaCerrado(), true);
});

test('listarPermutas rechaza IDs que no comparten documento', async () => {
  const fake = crearCliente([]);
  database.connectPostgreSQL = async () => fake.client;
  console.error = () => {};

  await assert.rejects(
    permutaService.listarPermutas([10, 20], 'alumno1'),
    /no pertenecen a un mismo documento/
  );
  assert.equal(fake.estaCerrado(), true);
});

test('verListaPermutas no mezcla documentos de la misma pareja', async () => {
  const filaBase = {
    usuario_1_uvus: 'alumno1',
    usuario_2_uvus: 'alumno2',
    usuario_1_nombre: 'Alumno Uno',
    usuario_2_nombre: 'Alumno Dos',
    usuario_1_estudio: 'GII-IS',
    usuario_2_estudio: 'GII-IS',
  };
  const fake = crearCliente([
    {
      ...filaBase,
      documento_permuta_id: 40,
      permuta_id: 10,
      nombre_asignatura: 'Asignatura antigua',
      codigo_asignatura: 100,
    },
    {
      ...filaBase,
      documento_permuta_id: 42,
      permuta_id: 11,
      nombre_asignatura: 'Asignatura actual',
      codigo_asignatura: 200,
    },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await solicitudPermutaService.verListaPermutas('alumno1');

  assert.equal(resultado.length, 2);
  assert.deepEqual(
    resultado.map((grupo) => grupo.permutas.map((permuta) => permuta.permuta_id)),
    [[10], [11]]
  );
  assert.match(fake.consultas[0].text, /documento\.id AS documento_permuta_id/);
  assert.equal(fake.estaCerrado(), true);
});
