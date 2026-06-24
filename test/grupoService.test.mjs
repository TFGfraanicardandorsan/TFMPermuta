import test from 'node:test';
import assert from 'node:assert/strict';
import database from '../src/config/database.mjs';
import grupoService from '../src/services/grupoService.mjs';

const originalConnectPostgreSQL = database.connectPostgreSQL;

const textoQuery = (query) => typeof query === 'string' ? query : query.text;

const crearClienteConRespuestas = (respuestas) => {
  const consultas = [];
  let cerrado = false;

  return {
    consultas,
    estaCerrado: () => cerrado,
    client: {
      async query(query) {
        consultas.push(query);
        const respuesta = respuestas.shift();
        if (respuesta instanceof Error) {
          throw respuesta;
        }
        if (typeof respuesta === 'function') {
          return respuesta(query);
        }
        return respuesta ?? { rows: [] };
      },
      async end() {
        cerrado = true;
      },
    },
  };
};

test.afterEach(() => {
  database.connectPostgreSQL = originalConnectPostgreSQL;
});

test('crearGrupoAsignatura crea el grupo siguiente al mayor existente', async () => {
  const fake = crearClienteConRespuestas([
    { rows: [] },
    { rows: [{ id: 10, codigo: 2050001, nombre: 'Matemáticas', curso: 'PRIMERO' }] },
    { rows: [{ max_grupo: 3 }] },
    { rows: [{ id: 99, numGrupo: '4', asignaturaId: 10 }] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.crearGrupoAsignatura(2050001);

  assert.equal(resultado.asignaturasProcesadas, 1);
  assert.equal(resultado.gruposCreados[0].numGrupo, '4');
  assert.deepEqual(fake.consultas[3].values, ['4', 10]);
  assert.equal(textoQuery(fake.consultas[0]), 'BEGIN');
  assert.equal(textoQuery(fake.consultas[4]), 'COMMIT');
  assert.equal(fake.estaCerrado(), true);
});

test('crearGruposCursoGrado crea un grupo secuencial por cada asignatura del curso', async () => {
  const fake = crearClienteConRespuestas([
    { rows: [] },
    {
      rows: [
        { id: 10, codigo: 2050001, nombre: 'Matemáticas', curso: 'PRIMERO' },
        { id: 11, codigo: 2050002, nombre: 'Física', curso: 'PRIMERO' },
      ],
    },
    { rows: [{ max_grupo: 2 }] },
    { rows: [{ id: 100, numGrupo: '3', asignaturaId: 10 }] },
    { rows: [{ max_grupo: 3 }] },
    { rows: [{ id: 101, numGrupo: '4', asignaturaId: 11 }] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.crearGruposCursoGrado(1, 'PRIMERO');

  assert.equal(resultado.asignaturasProcesadas, 2);
  assert.deepEqual(resultado.gruposCreados.map((grupo) => grupo.numGrupo), ['3', '4']);
  assert.deepEqual(fake.consultas[3].values, ['3', 10]);
  assert.deepEqual(fake.consultas[5].values, ['4', 11]);
});

test('eliminarUltimoGrupoAsignatura elimina el grupo de mayor valor', async () => {
  const fake = crearClienteConRespuestas([
    { rows: [] },
    { rows: [{ id: 10, codigo: 2050001, nombre: 'Matemáticas', curso: 'PRIMERO' }] },
    { rows: [{ id: 99, numGrupo: '4' }] },
    { rows: [{ usuarios: 0, grupos_deseados: 0, solicitudes: 0, permutas: 0 }] },
    { rows: [] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.eliminarUltimoGrupoAsignatura(2050001);

  assert.equal(resultado.gruposEliminados[0].numGrupo, '4');
  assert.match(textoQuery(fake.consultas[2]), /ORDER BY CAST\(nombre AS INTEGER\) DESC/);
  assert.deepEqual(fake.consultas[4].values, [99]);
  assert.equal(textoQuery(fake.consultas[5]), 'COMMIT');
});

test('eliminarUltimoGrupoAsignatura hace rollback si el grupo tiene relaciones', async () => {
  const fake = crearClienteConRespuestas([
    { rows: [] },
    { rows: [{ id: 10, codigo: 2050001, nombre: 'Matemáticas', curso: 'PRIMERO' }] },
    { rows: [{ id: 99, numGrupo: '4' }] },
    { rows: [{ usuarios: 1, grupos_deseados: 0, solicitudes: 0, permutas: 0 }] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  await assert.rejects(
    () => grupoService.eliminarUltimoGrupoAsignatura(2050001),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.deepEqual(error.detalles, {
        usuarios: 1,
        grupos_deseados: 0,
        solicitudes: 0,
        permutas: 0,
      });
      return true;
    },
  );

  assert.equal(fake.consultas.some((query) => textoQuery(query) === 'DELETE FROM grupo WHERE id = $1'), false);
  assert.equal(textoQuery(fake.consultas.at(-1)), 'ROLLBACK');
  assert.equal(fake.estaCerrado(), true);
});
