import fs from 'fs';

export const samlConfig = {
    entryPoint: 'https://ssopre.us.es/SAML2/SSOService.php', // URL del IDP (PREPRODUCCIÓN US)
    issuer: 'https://permutas.eii.us.es/simplesaml/',        // entityID del SP (Nuestro)
    callbackUrl: 'https://permutas.eii.us.es/simplesaml/module.php/saml/sp/saml2-acs.php/default-sp', // en producción sería     <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://permutas.eii.us.es/simplesaml/module.php/saml/sp/saml2-acs.php/default-sp" index="0"/>
    cert: fs.readFileSync('./src/config/certsSAML/idpCertificate.pem', 'utf-8'),   // Certificado del IdP
    privateKey: fs.readFileSync('./src/config/certsSAML/privateKey.pem', 'utf-8'),  // Clave privada del SP
    signatureAlgorithm: 'sha256',
    acceptedClockSkewMs: -1,
    disableRequestedAuthnContext: true,
    identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
    debug: true
};