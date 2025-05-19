class GenericValidators {
    /**
     * Valida que un valor sea un string no vacío y no supere la longitud máxima.
     * @param {any} valor - El valor a validar.
     * @param {string} nombreCampo - El nombre del campo para el mensaje de error.
     * @param {number} maxLength - Longitud máxima permitida.
     * @returns {{ valido: boolean, mensaje?: string }}
     */
    static isString(valor, nombreCampo = "El campo", maxLength = 255) {
        if (valor === null || valor === undefined) {
            return { valido: false, mensaje: `${nombreCampo} no puede ser nulo` };
        }
        if (typeof valor !== "string" || valor.trim() === "") {
            return { valido: false, mensaje: `${nombreCampo} debe ser un string no vacío` };
        }
        if (valor.length > maxLength) {
            return { valido: false, mensaje: `${nombreCampo} no puede superar ${maxLength} caracteres` };
        }
        return { valido: true };
    }

    /**
     * Valida que un valor sea un entero.
     * @param {any} valor - El valor a validar.
     * @param {string} nombreCampo - El nombre del campo para el mensaje de error.
     * @returns {{ valido: boolean, mensaje?: string }}
     */
    static isInteger(valor, nombreCampo = "El campo") {
        if (valor === null || valor === undefined) {
            return { valido: false, mensaje: `${nombreCampo} no puede ser nulo` };
        }
        if (!Number.isInteger(valor)) {
            return { valido: false, mensaje: `${nombreCampo} debe ser un entero` };
        }
        return { valido: true };
    }

    /**
     * Valida que el archivo sea PDF o PNG y que el nombre no supere la longitud máxima.
     * @param {string} fileId - Nombre del archivo.
     * @param {string} nombreCampo - Nombre del campo para el mensaje de error.
     * @param {number} maxLength - Longitud máxima permitida para el nombre del archivo.
     * @returns {{ valido: boolean, mensaje?: string }}
     */
    static isFilePdfOrPng(fileId, nombreCampo = "Archivo", maxLength = 50) {
        if (!fileId || typeof fileId !== "string") {
            return { valido: false, mensaje: `${nombreCampo} debe ser un string` };
        }
        if (fileId.length > maxLength) {
            return { valido: false, mensaje: `${nombreCampo} no puede superar ${maxLength} caracteres` };
        }
        if (!fileId.toLowerCase().endsWith(".pdf") && !fileId.toLowerCase().endsWith(".png")) {
            return { valido: false, mensaje: `${nombreCampo} debe ser un archivo PDF o PNG` };
        }
        return { valido: true };
    }

    /**
     * Valida que un valor sea array de enteros.
     * @param {any} valor - El valor a validar.
     * @param {string} nombreCampo - El nombre del campo para el mensaje de error.
     * @returns {{ valido: boolean, mensaje?: string }}
     */
    static isArrayOfIntegers(valor, nombreCampo = "El campo") {
        if (!Array.isArray(valor)) {
            return { valido: false, mensaje: `${nombreCampo} debe ser un array` };
        }
        for (const item of valor) {
            if (!Number.isInteger(item)) {
                return { valido: false, mensaje: `${nombreCampo} debe contener solo enteros` };
            }
        }
        return { valido: true };
    }
}


export default GenericValidators;