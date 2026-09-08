import test from 'node:test';
import assert from 'node:assert/strict';

import database from '../src/config/database.mjs';
import usuarioService from '../src/services/usuarioService.mjs';

const originalConnectPostgreSQL = database.connectPostgreSQL;

test.afterEach(() => {
  database.connectPostgreSQL = originalConnectPostgreSQL;
});

test('permite cambiar de grado si el usuario no tiene asignaturas activas', async () => {
  const consultas = [];
  database.connectPostgreSQL = async () => ({
    async query(query) {
      consultas.push(query);
      if (typeof query === 'object' && query.text.includes('FROM usuario u')) {
        return { rows: [{ id: 7, estudios_id_fk: 1 }] };
      }
      if (typeof query === 'object' && query.text.includes('FROM estudios')) {
        return { rows: [{ id: 2 }] };
      }
      if (typeof query === 'object' && query.text.includes('tiene_datos_academicos')) {
        return { rows: [{ tiene_datos_academicos: false }] };
      }
      return { rows: [] };
    },
    async end() {},
  });

  const resultado = await usuarioService.actualizarEstudiosUsuario('alice', 'Nuevo grado');

  assert.equal(resultado, 'Estudios actualizados');
  const actualizacion = consultas.find(
    (consulta) => typeof consulta === 'object' && consulta.text.includes('UPDATE usuario'),
  );
  assert.deepEqual(actualizacion.values, [2, 7]);
  assert.equal(consultas.includes('COMMIT'), true);
});

test('impide cambiar de grado mientras queden asignaturas activas', async () => {
  const consultas = [];
  database.connectPostgreSQL = async () => ({
    async query(query) {
      consultas.push(query);
      if (typeof query === 'object' && query.text.includes('FROM usuario u')) {
        return { rows: [{ id: 7, estudios_id_fk: 1 }] };
      }
      if (typeof query === 'object' && query.text.includes('FROM estudios')) {
        return { rows: [{ id: 2 }] };
      }
      if (typeof query === 'object' && query.text.includes('tiene_datos_academicos')) {
        return { rows: [{ tiene_datos_academicos: true }] };
      }
      return { rows: [] };
    },
    async end() {},
  });

  await assert.rejects(
    usuarioService.actualizarEstudiosUsuario('alice', 'Nuevo grado'),
    { statusCode: 409 },
  );
  assert.equal(consultas.at(-1), 'ROLLBACK');
  assert.equal(
    consultas.some((consulta) => typeof consulta === 'object' && consulta.text.includes('UPDATE usuario')),
    false,
  );
});
