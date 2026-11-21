import 'dotenv/config';

export function ssoConfig(env = process.env) {
  const base = new URL(env.PUBLIC_BASE_URL || 'https://permutas.eii.us.es');
  // Página de atributos del SP, consultada por el backend con sus cookies.
  const endpoint = new URL(env.SIMPLESAML_AUTH_URL
    || 'https://permutas.eii.us.es/simplesaml/module.php/core/authenticate.php?as=default-sp');
  // SimpleSAMLphp 1.x: authenticate.php muestra el estado; as_login.php acepta ReturnTo.
  const loginEndpoint = env.SIMPLESAML_LOGIN_URL
    ? new URL(env.SIMPLESAML_LOGIN_URL)
    : new URL('as_login.php', endpoint);
  if (!env.SIMPLESAML_LOGIN_URL) {
    loginEndpoint.searchParams.set('AuthId', endpoint.searchParams.get('as') || 'default-sp');
  }
  if ([base, endpoint, loginEndpoint].some(url => url.protocol !== 'https:' || url.username || url.password)) {
    throw new Error('SSO requiere URLs HTTPS sin credenciales.');
  }
  return { base, endpoint, loginEndpoint };
}

export function ssoCookies(cookieHeader = '') {
  const names = new Set((process.env.SIMPLESAML_COOKIE_NAMES
    || 'SimpleSAMLSessionID,SimpleSAML,SimpleSAMLAuthToken,PHPSESSID').split(',').map(s => s.trim()));
  return cookieHeader.split(';').map(s => s.trim())
    .filter(s => names.has(s.slice(0, s.indexOf('='))))
    .join('; ');
}
