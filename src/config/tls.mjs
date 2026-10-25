import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, createPrivateKey, createPublicKey, X509Certificate } from 'node:crypto';

// Huella pública de la clave privada que estuvo versionada. No es un secreto.
const COMPROMISED_SPKI = '59b4812d8af74ef8853ef95eda9a3a7115ffa7c7844ce7245fb71afbf2459c7f';
const projectRoot = fs.realpathSync(fileURLToPath(new URL('../../', import.meta.url)));

export function loadTlsOptions(env = process.env) {
  const { SSL_KEY_PATH: keyPath, SSL_CERT_PATH: certPath, SSL_PASSPHRASE: passphrase } = env;
  if (!keyPath || !certPath || !path.isAbsolute(keyPath) || !path.isAbsolute(certPath)) {
    throw new Error('SSL_KEY_PATH y SSL_CERT_PATH deben ser rutas absolutas fuera del repositorio.');
  }
  const realKeyPath = fs.realpathSync(keyPath);
  const relative = path.relative(projectRoot, realKeyPath);
  if (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    throw new Error('La clave TLS debe almacenarse fuera del repositorio.');
  }
  const key = fs.readFileSync(realKeyPath);
  const cert = fs.readFileSync(certPath);
  const publicKey = createPublicKey(createPrivateKey({ key, passphrase })).export({ type: 'spki', format: 'der' });
  if (createHash('sha256').update(publicKey).digest('hex') === COMPROMISED_SPKI) {
    throw new Error('La clave TLS estuvo publicada en Git. Emite un certificado con una clave nueva.');
  }
  const certificate = new X509Certificate(cert);
  if (!publicKey.equals(certificate.publicKey.export({ type: 'spki', format: 'der' }))) {
    throw new Error('El certificado TLS y la clave privada no corresponden.');
  }
  if (Date.parse(certificate.validTo) <= Date.now() || Date.parse(certificate.validFrom) > Date.now()) {
    throw new Error('El certificado TLS no está dentro de su período de validez.');
  }
  return { key, cert, passphrase, minVersion: 'TLSv1.2' };
}
