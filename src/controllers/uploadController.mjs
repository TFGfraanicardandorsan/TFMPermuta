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
    const fileId = req.params.fileId;
    const filePath = path.join(process.env.UPLOADS_FOLDER, fileId);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('No se ha encontrado el archivo:', err);
            res.status(404).send('Archivo no encontrado');
        }
    });
};

export default {
   subirArchivo,
   servirArchivo
};
