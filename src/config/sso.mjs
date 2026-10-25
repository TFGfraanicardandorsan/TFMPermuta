import 'dotenv/config';

export function ssoConfig() {
  const base = new URL(process.env.PUBLIC_BASE_URL || 'https://permutas.eii.us.es');
  const endpoint = new URL(process.env.SIMPLESAML_AUTH_URL
    || 'https://permutas.eii.us.es/simplesaml/module.php/core/authenticate.php?as=default-sp');
  if (base.protocol !== 'https:' || endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
    throw new Error('SSO requiere URLs HTTPS sin credenciales.');
  }
  return { base, endpoint };
}

export function ssoCookies(cookieHeader = '') {
  const names = new Set((process.env.SIMPLESAML_COOKIE_NAMES || 'SimpleSAMLSessionID,PHPSESSID').split(',').map(s => s.trim()));
  return cookieHeader.split(';').map(s => s.trim())
    .filter(s => names.has(s.slice(0, s.indexOf('='))))
    .join('; ');
}
