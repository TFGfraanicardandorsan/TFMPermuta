export const extractAttributes = (html) => {
    const attributes = {};

    // Lista de atributos que queremos extraer
    const attributeKeys = {
        "givenname": "Nombre",
        "mail": "Correo electrónico",
        "schacuserstatus": "Estado del usuario",
        "sn1": "Primer apellido",
        "sn2": "Segundo apellido",
        "uid": "Identificador de usuario",
        "urn:oasis:names:tc:SAML:attribute:subject-id": "Sujeto SAML"
    };

    // Expresión regular para capturar los atributos de la tabla
    const regex = /<td class="attrname">(?:[^<]+<br\/>)?<code>([^<]+)<\/code><\/td>\s*<td class="attrvalue">([^<]+)<\/td>/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
        const key = match[1];
        const value = match[2];

        if (attributeKeys[key]) {
            attributes[attributeKeys[key]] = value;
        }
    }
    return attributes;
};