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
    { rows: [] },
    { rows: [{ max_grupo: 3 }] },
    { rows: [{ id: 99, numGrupo: '4', asignaturaId: 10 }] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.crearGrupoAsignatura(2050001);

  assert.equal(resultado.asignaturasProcesadas, 1);
  assert.equal(resultado.gruposCreados[0].numGrupo, '4');
  assert.deepEqual(fake.consultas[4].values, ['4', 10]);
  assert.equal(textoQuery(fake.consultas[0]), 'BEGIN');
  assert.equal(textoQuery(fake.consultas[5]), 'COMMIT');
  assert.equal(fake.estaCerrado(), true);
});

test('crearGrupoAsignatura rehabilita el primer grupo deshabilitado disponible', async () => {
  const fake = crearClienteConRespuestas([
    { rows: [] },
    { rows: [{ id: 10, codigo: 2050001, nombre: 'Matemáticas', curso: 'PRIMERO' }] },
    { rows: [{ id: 98, nombre: '3' }] },
    { rows: [{ id: 98, numGrupo: '3', asignaturaId: 10 }] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.crearGrupoAsignatura(2050001);

  assert.equal(resultado.gruposCreados[0].numGrupo, '3');
  assert.equal(resultado.gruposCreados[0].rehabilitado, true);
  assert.match(textoQuery(fake.consultas[2]), /habilitado = false/);
  assert.match(textoQuery(fake.consultas[3]), /UPDATE grupo/);
  assert.equal(fake.consultas.some((query) => /INSERT INTO grupo/.test(textoQuery(query))), false);
  assert.equal(textoQuery(fake.consultas[4]), 'COMMIT');
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
    { rows: [] },
    { rows: [{ max_grupo: 2 }] },
    { rows: [{ id: 100, numGrupo: '3', asignaturaId: 10 }] },
    { rows: [] },
    { rows: [{ max_grupo: 3 }] },
    { rows: [{ id: 101, numGrupo: '4', asignaturaId: 11 }] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.crearGruposCursoGrado(1, 'PRIMERO');

  assert.equal(resultado.asignaturasProcesadas, 2);
  assert.deepEqual(resultado.gruposCreados.map((grupo) => grupo.numGrupo), ['3', '4']);
  assert.deepEqual(fake.consultas[4].values, ['3', 10]);
  assert.deepEqual(fake.consultas[7].values, ['4', 11]);
});

test('obtenerTodosGruposMisAsignaturasSinGrupoUsuario excluye solo los grupos del usuario', async () => {
  const gruposEsperados = [
    { id: 2, numgrupo: '2', nombreasignatura: 'Matemáticas', codasignatura: 2050001 },
    { id: 3, numgrupo: '3', nombreasignatura: 'Matemáticas', codasignatura: 2050001 },
  ];
  const fake = crearClienteConRespuestas([{ rows: gruposEsperados }]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.obtenerTodosGruposMisAsignaturasSinGrupoUsuario('usuario');
  const query = fake.consultas[0];

  assert.deepEqual(resultado, gruposEsperados);
  assert.deepEqual(query.values, ['usuario']);
  assert.match(textoQuery(query), /ug\.grupo_id_fk = g\.id/);
  assert.doesNotMatch(textoQuery(query), /grupo_usuario\.asignatura_id_fk = g\.asignatura_id_fk/);
  assert.equal(fake.estaCerrado(), true);
});

test('eliminarUltimoGrupoAsignatura deshabilita el grupo activo de mayor valor', async () => {
  const fake = crearClienteConRespuestas([
    { rows: [] },
    { rows: [{ id: 10, codigo: 2050001, nombre: 'Matemáticas', curso: 'PRIMERO' }] },
    { rows: [{ id: 99, numGrupo: '4' }] },
    { rows: [{ usuarios: 0, grupos_deseados: 0, solicitudes: 0, permutas: 0 }] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.eliminarUltimoGrupoAsignatura(2050001);

  assert.equal(resultado.gruposEliminados[0].numGrupo, '4');
  assert.match(textoQuery(fake.consultas[2]), /ORDER BY CAST\(nombre AS INTEGER\) DESC/);
  assert.match(textoQuery(fake.consultas[4]), /UPDATE solicitud_permuta/);
  assert.match(textoQuery(fake.consultas[5]), /UPDATE permuta/);
  assert.match(textoQuery(fake.consultas[6]), /DELETE FROM usuario_grupo/);
  assert.match(textoQuery(fake.consultas[7]), /UPDATE grupo SET habilitado = false/);
  assert.deepEqual(fake.consultas[7].values, [99]);
  assert.equal(textoQuery(fake.consultas[8]), 'COMMIT');
});

test('eliminarUltimoGrupoAsignatura limpia usuarios y solicitudes antes de deshabilitar el grupo', async () => {
  const fake = crearClienteConRespuestas([
    { rows: [] },
    { rows: [{ id: 10, codigo: 2050001, nombre: 'Matemáticas', curso: 'PRIMERO' }] },
    { rows: [{ id: 99, numGrupo: '4' }] },
    { rows: [{ usuarios: 3, grupos_deseados: 0, solicitudes: 3, permutas: 0 }] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.eliminarUltimoGrupoAsignatura(2050001);

  assert.deepEqual(resultado.gruposEliminados[0].referenciasDesactivadas, {
    usuarios: 3,
    grupos_deseados: 0,
    solicitudes: 3,
    permutas: 0,
  });
  assert.match(textoQuery(fake.consultas[4]), /SET estado = 'CANCELADA', vigente = false/);
  assert.match(textoQuery(fake.consultas[6]), /DELETE FROM usuario_grupo/);
  assert.equal(textoQuery(fake.consultas.at(-1)), 'COMMIT');
});

test('eliminarUltimoGrupoAsignatura desactiva relaciones aunque el grupo tenga permutas', async () => {
  const fake = crearClienteConRespuestas([
    { rows: [] },
    { rows: [{ id: 10, codigo: 2050001, nombre: 'Matemáticas', curso: 'PRIMERO' }] },
    { rows: [{ id: 99, numGrupo: '4' }] },
    { rows: [{ usuarios: 1, grupos_deseados: 0, solicitudes: 0, permutas: 1 }] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await grupoService.eliminarUltimoGrupoAsignatura(2050001);

  assert.deepEqual(resultado.gruposEliminados[0].referenciasDesactivadas, {
    usuarios: 1,
    grupos_deseados: 0,
    solicitudes: 0,
    permutas: 1,
  });
  assert.match(textoQuery(fake.consultas[5]), /UPDATE permuta/);
  assert.match(textoQuery(fake.consultas[7]), /UPDATE grupo SET habilitado = false/);
  assert.equal(textoQuery(fake.consultas.at(-1)), 'COMMIT');
  assert.equal(fake.estaCerrado(), true);
});
