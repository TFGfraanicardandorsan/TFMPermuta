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
      return { rows: [] };
    },
    async end() {},
  });

  await usuarioService.actualizarUsuario('alice', {
    nombre_completo: 'Alice',
    correo: 'alice@example.com',
    rol: 'delgacion',
  });

  assert.equal(consultas[1].values[0], 'delegacion');
});
