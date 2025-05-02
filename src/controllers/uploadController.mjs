import path from 'path';

const subirArchivo = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se ha subido ningún archivo');
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
