import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CSRF_ERROR_CODE,
  createCsrfProtection,
  issueCsrfToken,
} from '../src/middleware/csrf.mjs';

const createResponse = () => {
  const headers = new Map();
  return {
    statusCode: 200,
    body: null,
    headers,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
};

const createRequest = ({
  method = 'POST',
  path = '/api/v1/grupo/crearGrupoAsignatura',
  session = {},
  headers = {},
} = {}) => ({
  method,
  path,
  session,
  get(name) {
    return headers[name.toLowerCase()];
  },
});

test('issueCsrfToken genera un token aleatorio ligado a la sesión', () => {
  const req = createRequest({ method: 'GET' });
  const res = createResponse();

  issueCsrfToken(req, res);

  assert.equal(typeof req.session.csrfToken, 'string');
  assert.ok(req.session.csrfToken.length >= 43);
  assert.equal(res.body.csrfToken, req.session.csrfToken);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('la protección CSRF acepta una petición POST con token válido', () => {
  const middleware = createCsrfProtection();
  const token = 'token-seguro-de-prueba';
  const req = createRequest({
    session: { csrfToken: token },
    headers: { 'x-csrf-token': token, 'sec-fetch-site': 'same-origin' },
  });
  const res = createResponse();
  let continued = false;

  middleware(req, res, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.equal(res.statusCode, 200);
});

test('la protección CSRF rechaza POST sin token', () => {
  const middleware = createCsrfProtection();
  const req = createRequest({ session: { csrfToken: 'token-esperado' } });
  const res = createResponse();

  middleware(req, res, () => assert.fail('No debe continuar'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, CSRF_ERROR_CODE);
  assert.equal(res.headers.get('x-csrf-error'), '1');
});

test('la protección CSRF rechaza peticiones cross-site aunque incluyan token', () => {
  const middleware = createCsrfProtection({
    allowedOrigins: ['http://localhost:3033'],
  });
  const token = 'token-seguro-de-prueba';
  const req = createRequest({
    session: { csrfToken: token },
    headers: {
      'x-csrf-token': token,
      'sec-fetch-site': 'cross-site',
      origin: 'https://sitio-malicioso.example',
    },
  });
  const res = createResponse();

  middleware(req, res, () => assert.fail('No debe continuar'));

  assert.equal(res.statusCode, 403);
});

test('la protección permite un origen cross-site configurado en desarrollo', () => {
  const origin = 'http://localhost:3033';
  const middleware = createCsrfProtection({ allowedOrigins: [origin] });
  const token = 'token-seguro-de-prueba';
  const req = createRequest({
    session: { csrfToken: token },
    headers: {
      'x-csrf-token': token,
      'sec-fetch-site': 'cross-site',
      origin,
    },
  });
  let continued = false;

  middleware(req, createResponse(), () => {
    continued = true;
  });

  assert.equal(continued, true);
});

test('la protección permite métodos seguros y rutas técnicas ignoradas', () => {
  const ignoredPath = '/api/v1/telegram/webhook';
  const middleware = createCsrfProtection({ ignoredPaths: [ignoredPath] });

  for (const req of [
    createRequest({ method: 'GET' }),
    createRequest({ path: ignoredPath }),
  ]) {
    let continued = false;
    middleware(req, createResponse(), () => {
      continued = true;
    });
    assert.equal(continued, true);
  }
});
