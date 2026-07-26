import test from 'node:test';
import assert from 'node:assert/strict';

import database from '../src/config/database.mjs';
import { verificarRol } from '../src/middleware/rolMiddleware.mjs';
import { isAllowedRole, isSupportedRole, toCanonicalRole } from '../src/utils/roles.mjs';
import usuarioService from '../src/services/usuarioService.mjs';

const originalConnectPostgreSQL = database.connectPostgreSQL;

test.afterEach(() => {
  database.connectPostgreSQL = originalConnectPostgreSQL;
});

test('normaliza aliases del rol delegacion', () => {
  assert.equal(toCanonicalRole('delegacion'), 'delegacion');
  assert.equal(toCanonicalRole('delegación'), 'delegacion');
  assert.equal(toCanonicalRole('delgacion'), 'delegacion');
  assert.equal(isSupportedRole('delegación'), true);
  assert.equal(isAllowedRole('delgacion', 'delegacion'), true);
});

test('verificarRol permite roles normalizados y listas de roles', async () => {
  const middleware = verificarRol(['administrador', 'delegacion']);
  let nextCalled = false;

  middleware(
    { session: { user: { rol: 'delgacion' } } },
    {
      status() {
        throw new Error('No debería devolver 403');
      },
    },
    () => {
      nextCalled = true;
    },
  );

  assert.equal(nextCalled, true);
});

test('actualizarUsuario guarda delegacion como rol canonico', async () => {
  const consultas = [];
  database.connectPostgreSQL = async () => ({
    async query(query) {
      consultas.push(query);
      if (typeof query === 'object' && query.text.includes('RETURNING id')) {
        return { rows: [{ id: 7 }], rowCount: 1 };
      }
      return { rows: [] };
    },
    async end() {},
  });

  await usuarioService.actualizarUsuario('alice', {
    nombre_completo: 'Alice',
    correo: 'alice@example.com',
    rol: 'delgacion',
  });

  const actualizacionRol = consultas.find(
    (consulta) => typeof consulta === 'object' && consulta.text.includes('UPDATE roles'),
  );
  assert.equal(actualizacionRol.values[0], 'delegacion');
  assert.equal(actualizacionRol.values[1], 7);
});

test('actualizarUsuario revierte todos los cambios si falla la actualización del rol', async () => {
  const consultas = [];
  database.connectPostgreSQL = async () => ({
    async query(query) {
      consultas.push(query);
      if (typeof query === 'object' && query.text.includes('RETURNING id')) {
        return { rows: [{ id: 7 }], rowCount: 1 };
      }
      if (typeof query === 'object' && query.text.includes('UPDATE roles')) {
        const error = new Error('rol no válido');
        error.code = '23514';
        throw error;
      }
      return { rows: [] };
    },
    async end() {},
  });

  await assert.rejects(
    usuarioService.actualizarUsuario('alice', {
      nombre_completo: 'Alice',
      correo: 'alice@example.com',
      rol: 'administrador',
    }),
    { code: '23514' },
  );
  assert.equal(consultas.at(-1), 'ROLLBACK');
  assert.equal(consultas.includes('COMMIT'), false);
});

test('actualizarUsuario informa si el uvus no existe', async () => {
  const consultas = [];
  database.connectPostgreSQL = async () => ({
    async query(query) {
      consultas.push(query);
      if (typeof query === 'object' && query.text.includes('RETURNING id')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [] };
    },
    async end() {},
  });

  await assert.rejects(
    usuarioService.actualizarUsuario('inexistente', {
      nombre_completo: 'Nadie',
      correo: 'nadie@example.com',
      rol: 'administrador',
    }),
    { code: 'USUARIO_NO_ENCONTRADO' },
  );
  assert.equal(consultas.at(-1), 'ROLLBACK');
});
