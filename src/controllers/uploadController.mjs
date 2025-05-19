import path from 'path';
import { isValidPdfOrPngMime, isString } from '../utils/genericValidators.mjs';

const subirArchivo = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se ha subido ningún archivo');
    }
    if (!isValidPdfOrPngMime(req.file)) {
        return res.status(400).send('Solo se permiten archivos PDF o PNG válidos');
    }
    return res.status(200).json({
        message: "Archivo subido correctamente",
        fileId: req.file.filename   
    });
};

const servirArchivo = (req, res) => {
    const { tipo, fileId } = req.params;
    let baseDir;
    if (tipo === "archivador") {
        baseDir = process.env.ARCHIVADOR;
    } else if (tipo === "buzon") {
        baseDir = process.env.BUZON;
    } else {
        return res.status(400).send("Tipo de carpeta no válido");
    }
    if (!isString(fileId,50)) {
        return res.status(400).send("Nombre de archivo no válido (debe ser PDF o PNG)");
    }
    const filePath = path.join(baseDir, fileId);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('No se ha encontrado el archivo:', err);
            res.status(404).send('Archivo no encontrado');
        }
    });
};

const obtenerPlantillaPermuta = (req, res) => {
    const pdfPath = path.join(process.env.ARCHIVADOR, 'plantillaPermuta2425.pdf');
    res.sendFile(pdfPath, (err) => {
        if (err) {
            console.error('No se ha encontrado el archivo:', err);
            res.status(404).send('Archivo no encontrado');
        }
    });
}

export default {
   subirArchivo,
   servirArchivo,
   obtenerPlantillaPermuta
};
