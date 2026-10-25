import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

// Ejecutar como propietario de .env con el servicio detenido. No imprime secretos.
const envPath = new URL('../.env', import.meta.url);
const stat = await fs.lstat(envPath);
if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('.env debe ser un archivo normal.');
let content = await fs.readFile(envPath, 'utf8');
const backup = new URL(`../.env.backup-${Date.now()}`, import.meta.url);
await fs.writeFile(backup, content, { mode: 0o600, flag: 'wx' });
for (const name of ['SESSION_SECRET', 'TELEGRAM_WEBHOOK_SECRET']) {
  content = content.replace(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=.*(?:\\r?\\n|$)`, 'gm'), '');
  content += `\n${name}=${randomBytes(48).toString('hex')}\n`;
}
await fs.writeFile(envPath, content, { mode: 0o600 });
await fs.chmod(envPath, 0o600);
console.log('SESSION_SECRET y TELEGRAM_WEBHOOK_SECRET rotados. Copia de seguridad privada creada.');
