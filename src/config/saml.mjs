import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

export const samlConfig = {
    entryPoint: 'https://ssopre.us.es/SAML2/SSOService.php',
    issuer: 'https://ssopre.us.es',
    callbackUrl: 'http://localhost:3000/auth/saml/callback',
    metadataUrl: 'https://ssopre.us.es/metadata/saml2/',
    privateKey: fs.readFileSync(path.join(dirName, 'certs', 'certificate.pem'), 'utf-8'),
    signatureAlgorithm: 'sha256',
    acceptedClockSkewMs: -1,
    disableRequestedAuthnContext: true,
    identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
    debug: true
};
// LOGS ACTIVADOS de Passport-SAML para observar lo que esta pasando por consola

// Configuración de los parámetros de Passport-SAML
// entryPoint: La URL del servicio de inicio de sesión. (Opcional, ya que viene en los metadatos).
// metadataUrl: URL para obtener dinámicamente la configuración desde el IdP.
// privateKey: Clave privada del Service Provider (SP).
// identifierFormat: Formato de identificación utilizado en la autenticación.
