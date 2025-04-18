import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta absoluta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolver rutas absolutas para los certificados
const certPathIDP = path.resolve(__dirname, 'certsSAML', 'idpCertificate.pem');
const keyPath = path.resolve(__dirname, 'certsSAML', 'privateKey.pem');

export const samlConfig = {
    entryPoint: 'https://ssopre.us.es/SAML2/SSOService.php',
    issuer: 'https://permutas.eii.us.es/simplesaml/',        
    callbackUrl: 'https://permutas.eii.us.es/simplesaml/module.php/saml/sp/saml2-acs.php/default-sp', 
    cert: fs.readFileSync(certPathIDP, 'utf-8'),   
    privateKey: fs.readFileSync(keyPath, 'utf-8'),  
    signatureAlgorithm: 'sha256',
    acceptedClockSkewMs: -1,
    disableRequestedAuthnContext: true,
    identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
    passReqToCallback: true,
    logoutUrl: 'https://permutas.eii.us.es/simplesaml/module.php/saml/sp/saml2-logout.php/default-sp',
};