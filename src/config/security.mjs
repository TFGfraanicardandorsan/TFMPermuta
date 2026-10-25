import 'dotenv/config';

export function securityConfig(env = process.env) {
  if (!env.SESSION_SECRET || Buffer.byteLength(env.SESSION_SECRET) < 32) {
    throw new Error('SESSION_SECRET debe contener al menos 32 bytes aleatorios.');
  }
  const production = env.NODE_ENV === 'production';
  if (production && !env.FRONTEND_ORIGINS) {
    throw new Error('Configura FRONTEND_ORIGINS explícitamente en producción.');
  }
  const frontendOrigins = (env.FRONTEND_ORIGINS || 'https://permutas.eii.us.es,http://localhost:3033')
    .split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of frontendOrigins) {
    const url = new URL(origin);
    if (url.origin !== origin || (production ? url.protocol !== 'https:' : !['http:', 'https:'].includes(url.protocol))) {
      throw new Error('FRONTEND_ORIGINS debe contener orígenes completos y HTTPS en producción.');
    }
  }
  if (env.TELEGRAM_BOT_TOKEN && !/^[A-Za-z0-9_-]{32,256}$/.test(env.TELEGRAM_WEBHOOK_SECRET || '')) {
    throw new Error('Configura TELEGRAM_WEBHOOK_SECRET antes de habilitar el bot.');
  }
  if (['true', '1', '*'].includes(env.TRUST_PROXY)) {
    throw new Error('TRUST_PROXY debe indicar IPs o subredes concretas, no confiar en cualquier cliente.');
  }
  return { production, frontendOrigins, trustProxy: env.TRUST_PROXY || false };
}
