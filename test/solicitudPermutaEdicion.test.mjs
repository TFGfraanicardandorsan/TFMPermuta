import test from 'node:test';
import assert from 'node:assert/strict';
import database from '../src/config/database.mjs';
import solicitudPermutaService from '../src/services/solicitudPermutaService.mjs';
import solicitudPermutaController from '../src/controllers/solicitudPermutaController.mjs';
import solicitudPermutaRoutes from '../src/routes/solicitudPermutaRoutes.mjs';

const originalConnectPostgreSQL = database.connectPostgreSQL;
const originalEditarGruposDeseados = solicitudPermutaService.editarGruposDeseados;

const textoQuery = (query) => typeof query === 'string' ? query : query.text;

const crearCliente = (resolver) => {
  const consultas = [];
  let cerrado = false;
  return {
    consultas,
    estaCerrado: () => cerrado,
    client: {
      async query(query) {
        consultas.push(query);
        return resolver(query, consultas.length - 1) ?? { rows: [] };
      },
      async end() {
        cerrado = true;
      },
    },
  };
};

const solicitudEditable = {
  id: 7,
  usuario_id_fk: 1,
  id_asignatura_fk: 5,
  grupo_solicitante_id_fk: 10,
  estado: 'SOLICITADA',
  vigente: true,
};

const crearClienteEdicion = ({
  solicitudInicial = solicitudEditable,
  solicitudBloqueada = solicitudEditable,
  grupos = [
    { id: 10, nombre: '1', asignatura_id_fk: 5, habilitado: true },
    { id: 20, nombre: '2', asignatura_id_fk: 5, habilitado: true },
    { id: 30, nombre: '3', asignatura_id_fk: 5, habilitado: true },
  ],
  permutaActiva = false,
  gruposActuales = [20, 40],
  falloDml = null,
} = {}) => crearCliente((query) => {
  const texto = textoQuery(query);
  if (texto === 'BEGIN' || texto === 'COMMIT' || texto === 'ROLLBACK') return { rows: [] };
  if (/pg_advisory_xact_lock/.test(texto)) return { rows: [{}] };
  if (/FROM solicitud_permuta sp/.test(texto) && /INNER JOIN usuario u/.test(texto)) {
    if (/FOR UPDATE OF sp/.test(texto)) {
      return { rows: solicitudBloqueada ? [solicitudBloqueada] : [] };
    }
    return { rows: solicitudInicial ? [solicitudInicial] : [] };
  }
  if (/FROM grupo\s+WHERE id = ANY/.test(texto)) return { rows: grupos };
  if (/FROM permuta p/.test(texto)) return { rows: permutaActiva ? [{ existe: 1 }] : [] };
  if (/SELECT grupo_id_fk\s+FROM grupo_deseado/.test(texto)) {
    return { rows: gruposActuales.map((grupo_id_fk) => ({ grupo_id_fk })) };
  }
  if (/DELETE FROM grupo_deseado/.test(texto)) {
    if (falloDml === 'DELETE') throw new Error('Fallo DELETE simulado');
    return { rows: [], rowCount: 1 };
  }
  if (/INSERT INTO grupo_deseado/.test(texto)) {
    if (falloDml === 'INSERT') throw new Error('Fallo INSERT simulado');
    return { rows: [], rowCount: 1 };
  }
  throw new Error(`Consulta inesperada en el doble de prueba: ${texto}`);
});

const crearRespuesta = () => ({
  statusCode: 200,
  body: undefined,
  status(codigo) {
    this.statusCode = codigo;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  send(body) {
    this.body = body;
    return this;
  },
});

test.afterEach(() => {
  database.connectPostgreSQL = originalConnectPostgreSQL;
  solicitudPermutaService.editarGruposDeseados = originalEditarGruposDeseados;
});

test('la ruta de edición usa PATCH, rol de estudiante y el controlador esperado', () => {
  const capa = solicitudPermutaRoutes.stack.find(
    (item) => item.route?.path === '/:solicitudId/grupos-deseados'
  );

  assert.ok(capa);
  assert.equal(capa.route.methods.patch, true);
  assert.equal(capa.route.stack.length, 2);
  assert.equal(capa.route.stack.at(-1).handle, solicitudPermutaController.editarGruposDeseados);
});

test('el controlador rechaza eliminar todos los grupos sin invocar el servicio', async () => {
  solicitudPermutaService.editarGruposDeseados = async () => assert.fail('No debe invocar el servicio');
  const res = crearRespuesta();

  await solicitudPermutaController.editarGruposDeseados({
    session: { user: { nombre_usuario: 'alumno' } },
    params: { solicitudId: '7' },
    body: { grupos_deseados_ids: [] },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.err, true);
});

test('el controlador valida el ID estrictamente y no acepta prefijos numéricos', async () => {
  solicitudPermutaService.editarGruposDeseados = async () => assert.fail('No debe invocar el servicio');
  const res = crearRespuesta();

  await solicitudPermutaController.editarGruposDeseados({
    session: { user: { nombre_usuario: 'alumno' } },
    params: { solicitudId: '7abc' },
    body: { grupos_deseados_ids: [20] },
  }, res);

  assert.equal(res.statusCode, 400);
});

test('el controlador deduplica IDs antes de invocar el servicio', async () => {
  let argumentos;
  solicitudPermutaService.editarGruposDeseados = async (...args) => {
    argumentos = args;
    return { solicitud_id: 7 };
  };
  const res = crearRespuesta();

  await solicitudPermutaController.editarGruposDeseados({
    session: { user: { nombre_usuario: 'alumno' } },
    params: { solicitudId: '7' },
    body: { grupos_deseados_ids: [20, 20, 30] },
  }, res);

  assert.deepEqual(argumentos, ['alumno', 7, [20, 30]]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.err, false);
});

test('editarGruposDeseados ejecuta solo DELETE e INSERT para las diferencias', async () => {
  const fake = crearClienteEdicion();
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await solicitudPermutaService.editarGruposDeseados('alumno', 7, [20, 30]);
  const deleteQuery = fake.consultas.find((query) => /DELETE FROM grupo_deseado/.test(textoQuery(query)));
  const insertQuery = fake.consultas.find((query) => /INSERT INTO grupo_deseado/.test(textoQuery(query)));

  assert.deepEqual(deleteQuery.values, [7, [40]]);
  assert.deepEqual(insertQuery.values, [7, [30]]);
  assert.deepEqual(resultado, {
    solicitud_id: 7,
    grupos_deseados: ['2', '3'],
    grupos_deseados_ids: [20, 30],
    cambios: { insertados: [30], eliminados: [40] },
  });
  assert.match(textoQuery(fake.consultas[1]), /pg_advisory_xact_lock/);
  assert.match(
    textoQuery(fake.consultas.find((query) => /ORDER BY id\s+FOR SHARE/.test(textoQuery(query)))),
    /FOR SHARE/
  );
  assert.equal(textoQuery(fake.consultas.at(-1)), 'COMMIT');
  assert.equal(fake.estaCerrado(), true);
});

test('editarGruposDeseados no hace DML cuando el conjunto no cambia', async () => {
  const fake = crearClienteEdicion({ gruposActuales: [20, 30] });
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await solicitudPermutaService.editarGruposDeseados('alumno', 7, [20, 30]);

  assert.equal(
    fake.consultas.some((query) => /(?:DELETE|INSERT) (?:FROM|INTO) grupo_deseado/.test(textoQuery(query))),
    false
  );
  assert.deepEqual(resultado.cambios, { insertados: [], eliminados: [] });
  assert.equal(textoQuery(fake.consultas.at(-1)), 'COMMIT');
});

test('editarGruposDeseados solo inserta cuando se añade un grupo', async () => {
  const fake = crearClienteEdicion({ gruposActuales: [20] });
  database.connectPostgreSQL = async () => fake.client;

  await solicitudPermutaService.editarGruposDeseados('alumno', 7, [20, 30]);

  assert.equal(fake.consultas.some((query) => /DELETE FROM grupo_deseado/.test(textoQuery(query))), false);
  const insertQuery = fake.consultas.find((query) => /INSERT INTO grupo_deseado/.test(textoQuery(query)));
  assert.deepEqual(insertQuery.values, [7, [30]]);
});

test('editarGruposDeseados solo elimina cuando se retira un grupo', async () => {
  const fake = crearClienteEdicion({ gruposActuales: [20, 30] });
  database.connectPostgreSQL = async () => fake.client;

  await solicitudPermutaService.editarGruposDeseados('alumno', 7, [20]);

  assert.equal(fake.consultas.some((query) => /INSERT INTO grupo_deseado/.test(textoQuery(query))), false);
  const deleteQuery = fake.consultas.find((query) => /DELETE FROM grupo_deseado/.test(textoQuery(query)));
  assert.deepEqual(deleteQuery.values, [7, [30]]);
});

test('editarGruposDeseados revierte toda la transacción si falla el DML', async () => {
  const fake = crearClienteEdicion({ falloDml: 'INSERT' });
  database.connectPostgreSQL = async () => fake.client;

  await assert.rejects(
    solicitudPermutaService.editarGruposDeseados('alumno', 7, [20, 30]),
    /Fallo INSERT simulado/
  );

  assert.equal(textoQuery(fake.consultas.at(-1)), 'ROLLBACK');
  assert.equal(fake.estaCerrado(), true);
});

test('editarGruposDeseados rechaza una solicitud ajena y revierte la transacción', async () => {
  const fake = crearClienteEdicion({ solicitudInicial: null });
  database.connectPostgreSQL = async () => fake.client;

  await assert.rejects(
    solicitudPermutaService.editarGruposDeseados('intruso', 7, [20]),
    (error) => error.statusCode === 404
  );

  assert.equal(textoQuery(fake.consultas.at(-1)), 'ROLLBACK');
  assert.equal(fake.estaCerrado(), true);
});

test('editarGruposDeseados rechaza grupos de otra asignatura o deshabilitados', async () => {
  const fake = crearClienteEdicion({
    grupos: [
      { id: 10, nombre: '1', asignatura_id_fk: 5, habilitado: true },
      { id: 20, nombre: '2', asignatura_id_fk: 99, habilitado: true },
    ],
    gruposActuales: [20],
  });
  database.connectPostgreSQL = async () => fake.client;

  await assert.rejects(
    solicitudPermutaService.editarGruposDeseados('alumno', 7, [20, 30]),
    (error) => error.statusCode === 400
      && error.detalles.gruposInvalidos.includes(20)
      && error.detalles.gruposInvalidos.includes(30)
  );

  assert.equal(textoQuery(fake.consultas.at(-1)), 'ROLLBACK');
  assert.equal(
    fake.consultas.some((query) => /(?:DELETE|INSERT) (?:FROM|INTO) grupo_deseado/.test(textoQuery(query))),
    false
  );
});

test('editarGruposDeseados rechaza solicitudes con permuta activa', async () => {
  const fake = crearClienteEdicion({ permutaActiva: true });
  database.connectPostgreSQL = async () => fake.client;

  await assert.rejects(
    solicitudPermutaService.editarGruposDeseados('alumno', 7, [20]),
    (error) => error.statusCode === 409
  );

  assert.equal(textoQuery(fake.consultas.at(-1)), 'ROLLBACK');
});

test('editarGruposDeseados valida el mínimo también en la capa de servicio', async () => {
  database.connectPostgreSQL = async () => assert.fail('No debe abrir una conexión');

  await assert.rejects(
    solicitudPermutaService.editarGruposDeseados('alumno', 7, []),
    (error) => error.statusCode === 400
  );
});

test('solicitarPermuta rechaza una lista vacía antes de abrir la transacción', async () => {
  database.connectPostgreSQL = async () => assert.fail('No debe abrir una conexión');

  await assert.rejects(
    solicitudPermutaService.solicitarPermuta('alumno', 2050001, []),
    (error) => error.statusCode === 400
  );
});

test('getMisSolicitudesPermuta conserva nombres y añade IDs y editable', async () => {
  const fake = crearCliente(() => ({
    rows: [
      {
        solicitud_id: 7,
        estado: 'SOLICITADA',
        grupo_solicitante: '1',
        grupo_deseado_id: 20,
        grupo_deseado: '2',
        codigo_asignatura: 2050001,
        nombre_asignatura: 'Matemáticas',
        editable: true,
      },
      {
        solicitud_id: 7,
        estado: 'SOLICITADA',
        grupo_solicitante: '1',
        grupo_deseado_id: 30,
        grupo_deseado: '3',
        codigo_asignatura: 2050001,
        nombre_asignatura: 'Matemáticas',
        editable: true,
      },
    ],
  }));
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await solicitudPermutaService.getMisSolicitudesPermuta('alumno');

  assert.deepEqual(resultado[0].grupos_deseados, ['2', '3']);
  assert.deepEqual(resultado[0].grupos_deseados_ids, [20, 30]);
  assert.equal(resultado[0].editable, true);
  assert.match(textoQuery(fake.consultas[0]), /NOT EXISTS/);
});

test('las solicitudes interesantes excluyen solo permutas activas y solicitudes solicitadas', async () => {
  const fake = crearCliente((query, indice) => indice === 0
    ? { rows: [{ id: 5 }] }
    : { rows: [] });
  database.connectPostgreSQL = async () => fake.client;

  await solicitudPermutaService.getSolicitudesPermutaInteresantes('alumno');
  const query = fake.consultas[1];

  assert.match(textoQuery(query), /sp\.estado = 'SOLICITADA'/);
  assert.match(textoQuery(query), /NOT EXISTS/);
  assert.match(textoQuery(query), /p\.vigente = true/);
  assert.deepEqual(query.values[2], ['PROPUESTA', 'ACEPTADA', 'VALIDADA', 'FINALIZADA']);
});

test('aceptarSolicitudPermuta comparte el advisory lock y bloquea grupos antes de la solicitud', async () => {
  const fake = crearCliente((query) => {
    const texto = textoQuery(query);
    if (texto === 'BEGIN' || texto === 'COMMIT' || /pg_advisory_xact_lock/.test(texto)) {
      return { rows: [] };
    }
    if (/FROM solicitud_permuta sp/.test(texto) && !/FOR UPDATE/.test(texto)) {
      return { rows: [{
        id: 7,
        usuario_id_fk: 1,
        id_asignatura_fk: 5,
        grupo_solicitante_id_fk: 10,
      }] };
    }
    if (/FROM usuario u/.test(texto) && /grupo_deseado gd/.test(texto)) {
      return { rows: [{ usuario_id: 2, grupo_id: 20 }] };
    }
    if (/FROM grupo\s+WHERE id = \$1/.test(texto)) return { rows: [{ id: 10 }] };
    if (/FROM solicitud_permuta\s+WHERE id = \$1/.test(texto) && /FOR UPDATE/.test(texto)) {
      return { rows: [{
        id: 7,
        usuario_id_fk: 1,
        id_asignatura_fk: 5,
        grupo_solicitante_id_fk: 10,
      }] };
    }
    if (/FROM permuta p/.test(texto)) return { rows: [] };
    if (/INSERT INTO permuta/.test(texto)) return { rows: [], rowCount: 1 };
    throw new Error(`Consulta inesperada: ${texto}`);
  });
  database.connectPostgreSQL = async () => fake.client;

  const resultado = await solicitudPermutaService.aceptarSolicitudPermuta('aceptante', 7);
  const indiceBloqueoSolicitud = fake.consultas.findIndex(
    (query) => /FROM solicitud_permuta\s+WHERE id = \$1/.test(textoQuery(query))
      && /FOR UPDATE/.test(textoQuery(query))
  );
  const indicesBloqueoGrupo = fake.consultas
    .map((query, indice) => /FOR SHARE/.test(textoQuery(query)) ? indice : -1)
    .filter((indice) => indice >= 0);

  assert.equal(resultado, 'Solicitud de permuta aceptada.');
  assert.match(textoQuery(fake.consultas[1]), /pg_advisory_xact_lock/);
  assert.ok(indicesBloqueoGrupo.length >= 2);
  assert.ok(indicesBloqueoGrupo.every((indice) => indice < indiceBloqueoSolicitud));
  assert.equal(textoQuery(fake.consultas.at(-1)), 'COMMIT');
});

test('cancelarSolicitudPermuta rechaza cancelar cuando existe una permuta activa', async () => {
  const fake = crearCliente((query) => {
    const texto = textoQuery(query);
    if (texto === 'BEGIN' || texto === 'ROLLBACK' || /pg_advisory_xact_lock/.test(texto)) {
      return { rows: [] };
    }
    if (/FROM solicitud_permuta sp/.test(texto) && /FOR UPDATE OF sp/.test(texto)) {
      return { rows: [{
        usuario_id_fk: 1,
        id_asignatura_fk: 5,
        estado: 'SOLICITADA',
        vigente: true,
        nombre_usuario: 'alumno',
      }] };
    }
    if (/FROM permuta p/.test(texto)) return { rows: [{ existe: 1 }] };
    throw new Error(`Consulta inesperada: ${texto}`);
  });
  database.connectPostgreSQL = async () => fake.client;

  await assert.rejects(
    solicitudPermutaService.cancelarSolicitudPermuta('alumno', 7),
    (error) => error.statusCode === 409
  );

  assert.equal(
    fake.consultas.some((query) => /UPDATE solicitud_permuta/.test(textoQuery(query))),
    false
  );
  assert.equal(textoQuery(fake.consultas.at(-1)), 'ROLLBACK');
});
