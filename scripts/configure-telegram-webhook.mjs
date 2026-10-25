import 'dotenv/config';
import { securityConfig } from '../src/config/security.mjs';

securityConfig();
if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('Falta TELEGRAM_BOT_TOKEN.');
const url = new URL('/api/v1/telegram/webhook', process.env.PUBLIC_BASE_URL || 'https://permutas.eii.us.es');
if (url.protocol !== 'https:') throw new Error('El webhook debe usar HTTPS.');
try {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ url: url.href, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query'], max_connections: 10 }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error('Telegram rechazó la configuración.');
  console.log('Webhook configurado con autenticación.');
} catch {
  console.error('No se pudo configurar el webhook. Comprueba token, conectividad y certificado.');
  process.exitCode = 1;
}
