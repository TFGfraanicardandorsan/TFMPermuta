import test from 'node:test';
import assert from 'node:assert/strict';
import { ssoConfig, ssoCookies } from '../src/config/sso.mjs';
import { checkTlsKeyExposure } from '../src/config/tls.mjs';

const HUELLA_EXPUESTA = '59b4812d8af74ef8853ef95eda9a3a7115ffa7c7844ce7245fb71afbf2459c7f';

test('el login de SimpleSAMLphp 1.x usa as_login.php con AuthId', () => {
  const { loginEndpoint, endpoint } = ssoConfig({});
  assert.equal(endpoint.pathname, '/simplesaml/module.php/core/authenticate.php');
  assert.equal(loginEndpoint.pathname, '/simplesaml/module.php/core/as_login.php');
  assert.equal(loginEndpoint.searchParams.get('AuthId'), 'default-sp');
});

test('SIMPLESAML_LOGIN_URL sustituye al endpoint de login deducido', () => {
  const { loginEndpoint } = ssoConfig({ SIMPLESAML_LOGIN_URL: 'https://idp.example.com/login' });
  assert.equal(loginEndpoint.href, 'https://idp.example.com/login');
  assert.throws(() => ssoConfig({ SIMPLESAML_LOGIN_URL: 'http://idp.example.com/login' }));
});

test('solo se reenvían las cookies de SimpleSAML', () => {
  assert.equal(
    ssoCookies('SimpleSAMLAuthToken=a; connect.sid=b; SimpleSAML=c; otra=d'),
    'SimpleSAMLAuthToken=a; SimpleSAML=c',
  );
});

test('la clave expuesta solo se acepta con su huella explícita en el entorno', () => {
  assert.equal(checkTlsKeyExposure('otra-huella', {}), undefined);
  assert.throws(() => checkTlsKeyExposure(HUELLA_EXPUESTA, {}), /publicada en Git/);
  assert.throws(() => checkTlsKeyExposure(HUELLA_EXPUESTA, { TLS_ACCEPT_EXPOSED_KEY_SHA256: 'true' }));
  assert.match(checkTlsKeyExposure(HUELLA_EXPUESTA, { TLS_ACCEPT_EXPOSED_KEY_SHA256: HUELLA_EXPUESTA }), /riesgo/);
});
